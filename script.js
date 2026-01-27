/*************************************** GLOBAL ELEMENT REFERENCES ***************************************/
const canvas = document.getElementById("canvas");

// Toolbar icons
const rectangle = document.getElementById("add-rectangle");
const textbox = document.getElementById("add-textbox");
const line = document.getElementById("add-line");
const arrow = document.getElementById("add-arrow");
const ellipse = document.getElementById("add-ellipse");

// Layers panel
const layersList = document.getElementById("layersList");
const moveUpBtn = document.getElementById("moveUp");
const moveDownBtn = document.getElementById("moveDown");

// Properties panel inputs
const propWidth = document.getElementById("propWidth");
const propHeight = document.getElementById("propHeight");
const propBg = document.getElementById("propBg");
const propText = document.getElementById("propText");
const textProp = document.getElementById("textProp");

const posX = document.getElementById("posX");
const posY = document.getElementById("posY");
const rotationInput = document.getElementById("rotationInput");
const radiusInput = document.getElementById("radiusInput");

// Export buttons
const exportJSONBtn = document.getElementById("exportJSON");
const exportHTMLBtn = document.getElementById("exportHTML");

let selectedElement = null;
let layers = [];

const shapeCounters = {
  rectangle: 0,
  text: 0,
  line: 0,
  arrow: 0,
  ellipse: 0
};

/***************************************  DRAG / RESIZE / ROTATE STATE  ***************************************/

let isDragging = false;
let isResizing = false;
let isRotating = false;

let startX, startY;
let startLeft, startTop;
let startWidth, startHeight;
let startMouseX, startMouseY;
let startElLeft, startElTop;

let resizeDir = "";
let centerX, centerY;

/***************************************  CREATE ELEMENT  ***************************************/

function createElement(type) {
  const el = document.createElement("div");

  shapeCounters[type]++;
  el.dataset.index = shapeCounters[type];

  el.dataset.type = type;
  el.className = "element " + type;

  // Default position
  el.style.left = "50px";
  el.style.top = "50px";

  if (type === "text") {
    el.innerText = "Text";
  }

  // Select on click
  el.addEventListener("click", e => {
    e.stopPropagation();
    selectElement(el);
  });

  // Start dragging
  el.addEventListener("mousedown", e => {
    if (e.target.classList.contains("resize-handle") || e.target.classList.contains("rotation-handle")) return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = el.offsetLeft;
    startTop = el.offsetTop;
  });

  canvas.appendChild(el);
  layers.push(el);

  updateLayersPanel();
  saveLayout();
}

/***************************************  SELECTION LOGIC ***************************************/

function selectElement(el) {
  if (selectedElement) {
    selectedElement.classList.remove("selected");
    removeResizeHandles(selectedElement);
    removeRotationHandle(selectedElement);
  }

  selectedElement = el;
  selectedElement.classList.add("selected");

  addResizeHandles(el);
  addRotationHandle(el);

  updateLayersPanel();
  updatePropertiesPanel();
}

// Deselect on canvas click
canvas.addEventListener("click", () => {
  if (!selectedElement) return;

  selectedElement.classList.remove("selected");
  removeResizeHandles(selectedElement);
  removeRotationHandle(selectedElement);
  selectedElement = null;

  updateLayersPanel();
});

/***************************************  DRAGGING  ***************************************/

document.addEventListener("mousemove", e => {
  if (isDragging && selectedElement) {
    let x = startLeft + (e.clientX - startX);
    let y = startTop + (e.clientY - startY);

    let maxX = canvas.clientWidth - selectedElement.offsetWidth;
    let maxY = canvas.clientHeight - selectedElement.offsetHeight;

    selectedElement.style.left = Math.max(0, Math.min(x, maxX)) + "px";
    selectedElement.style.top = Math.max(0, Math.min(y, maxY)) + "px";
  }

  /***************************************  RESIZING  ***************************************/

  if (isResizing && selectedElement) {
    const type = selectedElement.dataset.type;
    let dx = e.clientX - startMouseX;
    let dy = e.clientY - startMouseY;

    // Line & Arrow resize
    if (type === "line" || type === "arrow") {
      selectedElement.style.width =
        Math.max(30, startWidth + dx) + "px";
      return;
    }

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startElLeft;
    let newTop = startElTop;

    if (resizeDir.includes("r")) newWidth = startWidth + dx;
    if (resizeDir.includes("l")) {
      newWidth = startWidth - dx;
      newLeft = startElLeft + dx;
    }

    if (resizeDir.includes("b")) newHeight = startHeight + dy;
    if (resizeDir.includes("t")) {
      newHeight = startHeight - dy;
      newTop = startElTop + dy;
    }

    selectedElement.style.width = Math.max(30, newWidth) + "px";
    selectedElement.style.height = Math.max(30, newHeight) + "px";
    selectedElement.style.left = newLeft + "px";
    selectedElement.style.top = newTop + "px";
  }

  /***************************************  ROTATION  ***************************************/

  if (isRotating && selectedElement) {
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    angle = Math.round(angle);

    selectedElement.style.transform = `rotate(${angle}deg)`;
    selectedElement.dataset.rotation = angle;

    rotationInput.value = angle;
  }
});

// Stop all mouse actions
document.addEventListener("mouseup", () => {
  isDragging = false;
  isResizing = false;
  isRotating = false;
  saveLayout();
});

/***************************************  RESIZE HANDLES  ***************************************/

function addResizeHandles(el) {
  ["tl", "tr", "bl", "br"].forEach(pos => {
    const h = document.createElement("div");
    h.className = "resize-handle " + pos;

    h.addEventListener("mousedown", e => {
      e.stopPropagation();
      isResizing = true;
      resizeDir = pos;

      startMouseX = e.clientX;
      startMouseY = e.clientY;
      startWidth = el.offsetWidth;
      startHeight = el.offsetHeight;
      startElLeft = el.offsetLeft;
      startElTop = el.offsetTop;
    });

    el.appendChild(h);
  });
}

function removeResizeHandles(el) {
  el.querySelectorAll(".resize-handle").forEach(h => h.remove());
}

/***************************************  ROTATION HANDLE ***************************************/

function addRotationHandle(el) {
  const handle = document.createElement("div");
  handle.className = "rotation-handle";

  handle.addEventListener("mousedown", e => {
    e.stopPropagation();
    isRotating = true;

    const rect = el.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
  });

  el.appendChild(handle);
}

function removeRotationHandle(el) {
  const h = el.querySelector(".rotation-handle");
  if (h) h.remove();
}

/***************************************  LAYERS PANEL  ***************************************/

function getLayerName(el) {
  const type = el.dataset.type;
  const index = el.dataset.index;
  return type.charAt(0).toUpperCase() + type.slice(1) + " " + index;
}

function updateLayersPanel() {
  layersList.innerHTML = "";

  layers.forEach(el => {
    const li = document.createElement("li");
    li.innerText = getLayerName(el);

    if (el === selectedElement) li.classList.add("active");

    li.addEventListener("click", () => {
      selectElement(el);
    });

    layersList.appendChild(li);
  });
}

moveUpBtn.addEventListener("click", () => {
  if (!selectedElement) return;
  const i = layers.indexOf(selectedElement);
  if (i === layers.length - 1) return;

  [layers[i], layers[i + 1]] = [layers[i + 1], layers[i]];
  updateZIndex();
  updateLayersPanel();
  saveLayout();
});

moveDownBtn.addEventListener("click", () => {
  if (!selectedElement) return;
  const i = layers.indexOf(selectedElement);
  if (i === 0) return;

  [layers[i], layers[i - 1]] = [layers[i - 1], layers[i]];
  updateZIndex();
  updateLayersPanel();
  saveLayout();
});

function updateZIndex() {
  layers.forEach((el, i) => {
    el.style.zIndex = i + 1;
  });
}

/***************************************  PROPERTIES PANEL  ***************************************/

function updatePropertiesPanel() {
  if (!selectedElement) return;

  propWidth.value = selectedElement.offsetWidth;
  propHeight.value = selectedElement.offsetHeight;

  posX.value = parseInt(selectedElement.style.left) || 0;
  posY.value = parseInt(selectedElement.style.top) || 0;

  rotationInput.value = Math.round(selectedElement.dataset.rotation || 0);

  if (selectedElement.dataset.type === "text") {
    textProp.style.display = "block";
    propText.value = selectedElement.innerText;
  } else {
    textProp.style.display = "none";
  }

  radiusInput.value = parseInt(selectedElement.style.borderRadius) || 0;

  // propBg.value = selectedElement.style.backgroundColor
  // ? rgbToHex(selectedElement.style.backgroundColor)
  // : "#000000";

}

/*************************************** PROPERTY INPUT EVENTS ***************************************/

propWidth.oninput = () => {
  if (!selectedElement) return;
  selectedElement.style.width = propWidth.value + "px";
  saveLayout();
};

propHeight.oninput = () => {
  if (!selectedElement) return;
  selectedElement.style.height = propHeight.value + "px";
  saveLayout();
};

posX.oninput = () => {
  if (!selectedElement) return;
  selectedElement.style.left = posX.value + "px";
  saveLayout();
};

posY.oninput = () => {
  if (!selectedElement) return;
  selectedElement.style.top = posY.value + "px";
  saveLayout();
};

rotationInput.oninput = () => {
  if (!selectedElement) return;
  selectedElement.style.transform =
    `rotate(${rotationInput.value}deg)`;
  selectedElement.dataset.rotation = rotationInput.value;
  saveLayout();
};

radiusInput.oninput = () => {
  if (!selectedElement) return;
  selectedElement.style.borderRadius = radiusInput.value + "px";
  saveLayout();
};

propBg.addEventListener("input", () => {
  if (!selectedElement) return;

  selectedElement.style.backgroundColor = propBg.value;
  saveLayout();
});

propText.oninput = () => {
  if (!selectedElement) return;
  selectedElement.innerText = propText.value;
  saveLayout();
};

document.addEventListener("keydown", function (e) {

  /*  CTRL + S → Save layout  */
  if (e.ctrlKey && e.key.toLowerCase() === "s") {
    e.preventDefault(); // stop browser save
    saveLayout();
    return;
  }

  /*  CTRL + D → Duplicate  */
  if (e.ctrlKey && e.key.toLowerCase() === "d") {
    e.preventDefault();
    if (!selectedElement) return;

    const clone = selectedElement.cloneNode(true);

    // offset duplicated element
    clone.style.left = selectedElement.offsetLeft + 20 + "px";
    clone.style.top = selectedElement.offsetTop + 20 + "px";

    // update per-shape counter
    const type = clone.dataset.type;
    shapeCounters[type]++;
    clone.dataset.index = shapeCounters[type];

    // reattach events
    clone.addEventListener("click", ev => {
      ev.stopPropagation();
      selectElement(clone);
    });

    clone.addEventListener("mousedown", ev => {
      isDragging = true;
      startX = ev.clientX;
      startY = ev.clientY;
      startLeft = clone.offsetLeft;
      startTop = clone.offsetTop;
    });

    canvas.appendChild(clone);
    layers.push(clone);

    selectElement(clone);
    updateLayersPanel();
    saveLayout();
    return;
  }

  /*  ESC → Deselect */
  if (e.key === "Escape") {
    canvas.click();
    return;
  }

  // remaining shortcuts need a selected element
  if (!selectedElement) return;

  let step = e.shiftKey ? 10 : 1;
  let left = selectedElement.offsetLeft;
  let top = selectedElement.offsetTop;

  /*  DELETE / BACKSPACE  */
  if (e.key === "Delete" || e.key === "Backspace") {
    canvas.removeChild(selectedElement);
    layers = layers.filter(el => el !== selectedElement);
    selectedElement = null;
    updateLayersPanel();
    saveLayout();
    return;
  }

  /*  ARROW KEYS → Move  */
  if (e.key === "ArrowLeft") left -= step;
  if (e.key === "ArrowRight") left += step;
  if (e.key === "ArrowUp") top -= step;
  if (e.key === "ArrowDown") top += step;

  const maxX = canvas.clientWidth - selectedElement.offsetWidth;
  const maxY = canvas.clientHeight - selectedElement.offsetHeight;

  selectedElement.style.left =
    Math.max(0, Math.min(left, maxX)) + "px";
  selectedElement.style.top =
    Math.max(0, Math.min(top, maxY)) + "px";

  saveLayout();
});

/*************************************** SAVE & LOAD ***************************************/

function saveLayout() {
  const data = layers.map(el => ({
    type: el.dataset.type,
    index: el.dataset.index,
    left: el.style.left,
    top: el.style.top,
    width: el.style.width,
    height: el.style.height,
    bg: el.style.backgroundColor,
    text: el.innerText || "",
    rotation: el.dataset.rotation || 0,
    zIndex: el.style.zIndex
  }));

  localStorage.setItem("layout", JSON.stringify(data));
}

function loadLayout() {
  const saved = localStorage.getItem("layout");
  if (!saved) return;

  const data = JSON.parse(saved);

  data.forEach(item => {
    const el = document.createElement("div");
    el.className = "element " + item.type;

    el.dataset.type = item.type;
    el.dataset.index = item.index;
    shapeCounters[item.type] =
      Math.max(shapeCounters[item.type], item.index);

    el.style.left = item.left;
    el.style.top = item.top;
    el.style.width = item.width;
    el.style.height = item.height;
    el.style.backgroundColor = item.bg;
    el.style.zIndex = item.zIndex;
    el.style.transform = `rotate(${item.rotation}deg)`;
    el.dataset.rotation = item.rotation;

    if (item.type === "text") el.innerText = item.text;

    el.addEventListener("click", e => {
      e.stopPropagation();
      selectElement(el);
    });

    el.addEventListener("mousedown", e => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = el.offsetLeft;
      startTop = el.offsetTop;
    });

    canvas.appendChild(el);
    layers.push(el);
  });

  updateLayersPanel();
}

/*************************************** EXPORT  ***************************************/

exportJSONBtn.onclick = () => {
  const blob = new Blob(
    [JSON.stringify(layers.map(getLayerName), null, 2)],
    { type: "application/json" }
  );
  download(blob, "design.json");
};

exportHTMLBtn.onclick = () => {
  let html = "<div style='position:relative'>";
  layers.forEach(el => {
    html += `<div style="
      position:absolute;
      left:${el.style.left};
      top:${el.style.top};
      width:${el.style.width};
      height:${el.style.height};
      background:${el.style.backgroundColor};
      transform:rotate(${el.dataset.rotation || 0}deg);
      z-index:${el.style.zIndex};
    ">${el.innerText || ""}</div>`;
  });
  html += "</div>";

  download(new Blob([html], { type: "text/html" }), "design.html");
};

function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

/*************************************** TOOLBAR EVENTS ***************************************/
rectangle.onclick = () => createElement("rectangle");
textbox.onclick = () => createElement("text");
line.onclick = () => createElement("line");
arrow.onclick = () => createElement("arrow");
ellipse.onclick = () => createElement("ellipse");