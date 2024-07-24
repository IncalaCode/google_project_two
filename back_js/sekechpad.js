import ImportAI from "./connect_to_ai.js";
import * as get from "./highleft.js";

// sketchpadModule.js
export let canvas, ctx;
export let mouseX, mouseY, mouseDown = 0;
export let touchX, touchY;
export let strokes = [];
export let currentStroke = [];
export let save_strokes = true;
export let popup;
export const ai = new ImportAI();

// For the section to be added
export let sections = {};
// This is optional if the page button is not there
export let page = [];

// Undo and Redo stack
export let undoStack = [];
export let redoStack = [];

export function init() {
    canvas = document.getElementById('sketchpad');
    popup = document.createElement('div');
    popup.className = 'popup';
    document.body.appendChild(popup);

    if (canvas.getContext) {
        ctx = canvas.getContext('2d');
    }

    if (ctx) {
        canvas.addEventListener('mousedown', sketchpad_mouseDown, false);
        canvas.addEventListener('mousemove', sketchpad_mouseMove, false);
        window.addEventListener('mouseup', sketchpad_mouseUp, false);

        canvas.addEventListener('touchstart', sketchpad_touchStart, false);
        canvas.addEventListener('touchmove', sketchpad_touchMove, false);
        window.addEventListener('touchend', sketchpad_touchEnd, false);
    }

    document.addEventListener('keyup', handleKeyUp);

    // Add event listeners for buttons
    document.getElementById('clearbutton').addEventListener('click', clearCanvasAndStrokes);
    document.getElementById('showstrokes').addEventListener('click', toggleShowStrokes);
    document.getElementById('undobutton').addEventListener('click', undoLastStroke);
    document.getElementById('redobutton').addEventListener('click', redoLastStroke);
    document.getElementById('add_section').addEventListener('click', () => $('#sectionModal').modal('show'));
}

export function sketchpad_mouseDown(e) {
    mouseDown = 1;
    getMousePos(e);
    if (save_strokes) {
        currentStroke = [{ x: mouseX, y: mouseY, action: 'start', t: Date.now(), instruction: '' }];
    }
}

export async function sketchpad_mouseUp() {
    if (mouseDown === 1) {
        if (save_strokes && mouseX && mouseY) {
            let imgData = await ai.fileToGenerativePart(canvas.toDataURL());
            currentStroke.push({ action: 'end', t: Date.now() });
            strokes.push([currentStroke, imgData]);
            currentStroke = [];
            showPopup(mouseX, mouseY);
            saveToUndoStack();
        }
        mouseDown = 0;
    }
}

export function sketchpad_mouseMove(e) {
    if (mouseDown === 1) {
        let prevX = mouseX, prevY = mouseY;
        getMousePos(e);
        drawLine(ctx, prevX, prevY, mouseX, mouseY);
        if (save_strokes) {
            currentStroke.push({ x: mouseX, y: mouseY, action: 'move' });
        }
    }
}

export function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
}

export function sketchpad_touchStart(e) {
    getTouchPos(e);
    if (save_strokes) {
        currentStroke = [{ x: touchX, y: touchY, action: 'start', t: Date.now(), instruction: '' }];
    }
}

export function sketchpad_touchMove(e) {
    let prevX = touchX, prevY = touchY;
    getTouchPos(e);
    drawLine(ctx, prevX, prevY, touchX, touchY);
    if (save_strokes) {
        currentStroke.push({ x: touchX, y: touchY, action: 'move' });
    }
}

export async function sketchpad_touchEnd() {
    if (save_strokes) {
        let imgData = ai.fileToGenerativePart(canvas.toDataURL());
        currentStroke.push({ action: 'end', t: Date.now() });
        strokes.push([currentStroke, imgData]);
        currentStroke = [];
        showPopup(touchX, touchY);
        saveToUndoStack();
    }
}

export function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();
    touchX = e.touches[0].clientX - rect.left;
    touchY = e.touches[0].clientY - rect.top;
}

export function drawLine(ctx, x1, y1, x2, y2) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
}

export function handleKeyUp(e) {
    if (e.key === 'Enter') {
        if (popup.style.display === 'block') {
            saveCommentAndContinue();
        }
    }
}

export function showPopup(x, y) {
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.innerHTML = `
        <textarea id="instruction" placeholder="Enter instruction..."></textarea><br/>
        <button id="saveCommentAndContinue">Save & Continue</button>
        <button id="cancelLastStroke">Cancel Last</button>
    `;
    popup.style.display = 'block';

    document.getElementById('saveCommentAndContinue').addEventListener('click', saveCommentAndContinue);
    document.getElementById('cancelLastStroke').addEventListener('click', cancelLastStroke);
}

export function saveCommentAndContinue() {
    let instruction = document.getElementById('instruction').value.trim();
    if (instruction !== '' && strokes.length > 0) {
        strokes[strokes.length - 1 || 0][0][0].instruction = instruction; // Modify the instruction for the last stroke
    }
    hidePopup();
    get.getcode();
    redrawCanvas();
}

export function cancelLastStroke() {
    if (strokes.length > 0) {
        undoStack.push(strokes.pop());
        redrawCanvas();
    }
    hidePopup();
}

export function hidePopup() {
    popup.style.display = 'none';
}

export function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(stroke => {
        stroke[0].forEach((point, index) => {
            if (index === 0) {
                ctx.strokeStyle = point.color || '#000';
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
            } else if (point.action === 'move') {
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
            } else if (point.action === 'end') {
                ctx.closePath();
            }
        });
    });
}

export function clearCanvasAndStrokes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes = [];
    undoStack = [];
    redoStack = [];
}

export function toggleShowStrokes() {
    console.log(JSON.stringify(strokes));
}

export function undoLastStroke() {
    if (strokes.length > 0) {
        redoStack.push(strokes.pop());
        redrawCanvas();
    }
}

export function redoLastStroke() {
    if (redoStack.length > 0) {
        strokes.push(redoStack.pop());
        redrawCanvas();
    }
}

export function saveToUndoStack() {
    undoStack.push([...strokes]);
    redoStack = [];
}

// Show the modal
function showModal() {
    $('#sectionModal').modal('show');
}

// Close the modal
function closeModal() {
    $('#sectionModal').modal('hide');
}

// Add a section based on user input
function addSection() {
    const name = document.getElementById('sectionNameInput').value.trim();
    if (name === '') {
        alert('Section name cannot be empty.');
        return;
    }
    saveSection(name);
    const button = document.createElement('button');
    button.className = 'btn btn-secondary section';
    button.innerHTML = name;
    button.onclick = (event) => {
        const sectionName = event.currentTarget.textContent;
        saveCurrentSection();
        loadSection(sectionName);
    };
    document.getElementById('page_section').appendChild(button);
    closeModal();
}

// Event listeners for modal interactions
document.getElementById('submitSectionName').addEventListener('click', addSection);
document.querySelector('.close').addEventListener('click', closeModal);

// Close the modal if the user clicks outside of it
window.addEventListener('click', function (event) {
    const modal = document.getElementById('sectionModal');
    if (event.target === modal) {
        closeModal();
    }
});

function saveSection(name) {
    sections[name] = [...strokes];
    strokes = [];
    redrawCanvas();
}

function saveCurrentSection() {
    const currentSection = document.querySelector('.section.active');
    if (currentSection) {
        const sectionName = currentSection.textContent;
        sections[sectionName] = [...strokes];
    }
}

function loadSection(name) {
    strokes = sections[name] || [];
    redrawCanvas();
}

function strock_end(name) {
    sections[name] = [...strokes];
    strokes = [];
    redrawCanvas();
    return true;
}
