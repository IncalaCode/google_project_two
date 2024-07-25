import { GoogleGenerativeAI } from "@google/generative-ai";
import * as sketchpad from './sekechpad.js';
import NotyfService from "./message.shower.js";

class EditorManager {
    constructor(editorContainerId, outputFrameId) {
        this.editorContainerId = editorContainerId;
        this.outputFrameId = outputFrameId;
        this.editor = null;
        this.outputFrame = null;
        this.initializeEditor();
    }

    initializeEditor() {
        document.addEventListener('DOMContentLoaded', () => {
            const editorContainer = document.getElementById(this.editorContainerId);
            if (!editorContainer) {
                console.error(`Editor container with ID '${this.editorContainerId}' not found.`);
                return;
            }

            this.outputFrame = document.getElementById(this.outputFrameId);
            if (!this.outputFrame) {
                console.error(`Output frame with ID '${this.outputFrameId}' not found.`);
                return;
            }

            if (!this.editor) {
                require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs' } });
                require(['vs/editor/editor.main'], () => {
                    this.editor = monaco.editor.create(editorContainer, {
                        language: 'html',
                        theme: 'vs-dark'
                    });
                    this.editor.onDidChangeModelContent(() => {
                        this.updatePreview();
                    });
                });
            } else {
                console.warn('Editor already initialized.');
            }
        });
    }
    insertValue(value) {
        if (!this.editor) {
            console.error('Editor not initialized.');
            return;
        }
        const model = this.editor.getModel();
        if (!model) {
            console.error('Model not found.');
            return;
        }
        const position = this.editor.getPosition();
        const range = {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
        };
        model.applyEdits([{
            range: range,
            text: value
        }]);
    }

    updatePreview() {
        if (!this.editor) {
            console.error('Editor not initialized.');
            return;
        }
        const code = this.editor.getValue();
        const preview = this.outputFrame.contentDocument || this.outputFrame.contentWindow.document;
        preview.open();
        preview.write(code);
        preview.close();
    }
    clearEditor() {
        if (!this.editor) {
            console.error('Editor not initialized.');
            return;
        }

        try {
            this.editor.setValue(''); // Set editor content to an empty string
            console.log('Editor content cleared.');
        } catch (error) {
            console.error('Error clearing the editor content:', error);
        }
    }
}
export default class ImportAI {
    static whole = {
        head: {
            meta: [
                '<meta charset="UTF-8">',
                '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
            ],
            link: [],
            style: [],
            title: ''
        },
        body: {
            section: {}
        },
        script: [],
    };

    constructor(editorContainerId, outputFrameId) {
        this.genAI = new GoogleGenerativeAI("AIzaSyDTYPNXHwNE5nA5-uHRnBhS_mCXJSoDHXQ");
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        this.editorManager = new EditorManager("monaco-editor", "output");
    }

    async fileToGenerativePart(imageDataUrl) {
        const base64EncodedData = imageDataUrl.split(',')[1];
        const mimeType = imageDataUrl.split(':')[1].split(';')[0];
        return {
            inlineData: { data: base64EncodedData, mimeType: mimeType },
        };
    }

    async generate() {
        console.log('Debug Info:', sketchpad.strokes, sketchpad.sections, ImportAI.whole);

        const lastStrokeIndex = sketchpad.strokes.length - 1;
        const lastStroke = sketchpad.strokes[lastStrokeIndex] || [null, null];
        const lastStrokeData = lastStroke[0];
        const image = lastStroke[1];

        if (!lastStrokeData || !image) {
            console.error('No valid stroke data or image found.');
            return null;
        }


        const prompt = `
        You are an expert in math and geometry, as well as in frontend and backend development for professional websites that use user input and image analysis. Your task is to generate a specific HTML object based on the following details:
        
        - Depend on the user instructions or inputs, which are provided in the strokes data: ${JSON.stringify(this.collectValues())}.
        - Calculate the width and height of the object based on the provided information.
        - Analyze the image to identify the drawn object, considering the calculated start, move, and end positions.
        - analyze the postion to identify the action if there was object there and the user is asking for update or insert or delete.
        - Generate the HTML code for this object.
        - Split or classify the HTML code into three parts: the specific object HTML, additional CSS styling, and the script.
        - If the object is not found in the section history, determine the appropriate action (insert, update, or delete).

        The generated HTML code should include:
        - The width and height of the object and make it responsive for phone and PC.
        - Its position on the canvas (top, left, bottom, and right coordinates).
        - Specify the action (insert, update, or delete).
        - Any necessary links, CSS, styles, and scripts. Put any styling in CSS, any script in the script section, and any link with their tags in the link section.

        Remember the following:
        1. If the action is update or delete, you will put the exact name of the object to be updated or deleted.
        2. If you cannot find the object, search for it in the history.
        3. Before an insert action, check that the it update or delete by checking the position of the object and searching from the history first, and if it doesn't exist continue as insert, otherwise take the object name and return it in update format or delete format.
        4. Don't include integrity and crossorigin, only source in the CSS link and the JS link (script).

        Use this format for insert:
        {
            "html_code": {
                "html": "html_code_here",
                "style": "object_css_code",
                            "script": ["object_script_code with their tags","add all script needed for this if it does not exeist in history.script"],
                "link": ["object_link_code with their tags","add all script needed for this if it does not exeist in history.script"]
            },
            "position": {
                "top": object_top
            },
            "action": "insert",
            "object_name": "object_name",
            "image_description": ""
        }

        Use this format for update:
        {
            "html_code": {
                "html": "html_code_here",
                "style": "object_css_code",
                "script": ["object_script_code with their tags","add all script needed for this if it does not exeist in history.script"],
                "link": ["object_link_code with their tags","add all script needed for this if it does not exeist in history.script"]
            },
            "position": {
                "top": object_top
            },
            "action": "update",
            "object_name": "object_name" // the object name that will be updated from searching from history
        }

        Use this format for delete:
        {
            "action": "delete",
            "object_name": "object_name" // object name that will be deleted, search it from history
        }

        Use this format for unfound:
        {
            "action": "unfound",
            "object_name": "object_name", // if you can't find that object, search it from the history, otherwise it is unfound
            "reason": "reason for not found"
        }

        Strokes: ${JSON.stringify(lastStrokeData)}
        History: ${JSON.stringify(ImportAI.whole)}
        `;

        console.log('Generated Prompt:', prompt);

        try {
            const result = await this.model.generateContent([prompt, image]);
            const responseText = await result.response.text();
            const parsedResult = this.parseJsonFromText(responseText);
            console.log('Generated Content:', parsedResult);

            this.applyChanges(parsedResult, lastStrokeIndex);

            return this.joinlist();
        } catch (error) {
            console.error('Error generating content:', error);
            NotyfService.showMessage("error", 'Content generation failed due to policy restrictions.', false);
            return null;
        }
    }

    applyChanges(generatedContent, lastStrokeIndex) {
        switch (generatedContent.action) {
            case 'insert':
                this.insertElement(generatedContent, lastStrokeIndex);
                break;
            case 'update':
                this.updateElement(generatedContent, lastStrokeIndex);
                break;
            case 'delete':
                this.deleteElement(generatedContent, lastStrokeIndex);
                break;
            default:
                NotyfService.showMessage("error", 'Unknown action: ' + generatedContent.action, false);
        }
    }

    insertElement(generatedContent, lastStrokeIndex, updateObject) {
        ImportAI.whole.body.section[updateObject || `${lastStrokeIndex}`] = generatedContent.html_code.html;
        ImportAI.whole.head.link[updateObject || `${lastStrokeIndex}`] = generatedContent.html_code.link;
        ImportAI.whole.head.style[updateObject || `${lastStrokeIndex}`] = generatedContent.html_code.style;
        ImportAI.whole.script[updateObject || `${lastStrokeIndex}`] = generatedContent.html_code.script;
    }

    updateElement(generatedContent, lastStrokeIndex) {
        this.insertElement(generatedContent, lastStrokeIndex, generatedContent.object_name);
    }

    deleteElement(generatedContent, lastStrokeIndex) {
        ImportAI.whole.body.section[generatedContent.object_name] = "";
        ImportAI.whole.head.link[generatedContent.object_name] = "";
        ImportAI.whole.head.style[generatedContent.object_name] = "";
        ImportAI.whole.script[generatedContent.object_name] = "";
    }

    parseJsonFromText(text) {
        try {
            const startIndex = text.indexOf('{');
            const endIndex = text.lastIndexOf('}');
            const trimmedJsonData = text.substring(startIndex, endIndex + 1);
            return JSON.parse(trimmedJsonData.trim());
        } catch (error) {
            console.error('Error parsing JSON:', error);
            console.error('Input text:', text);
            return null;
        }
    }



    collectValues() {
        const framework = $('#custom_framework').val();
        const customFrameworkInput = $('#customFrameworkInput').val();
        const back_ground_color = $('#color1').val();
        const border_color = $('#color2').val();
        const button_color = $('#color3').val();
        const text_color = $('#color4').val();

        const collectedValues = {
            framework,
            customFrameworkInput,
            colors: {
                back_ground_color,
                border_color,
                button_color,
                text_color
            }
        };

        console.log('Collected Values:', collectedValues);
        return collectedValues;
    }

    joinlist() {
        const headContent = [
            ...ImportAI.whole.head.meta,
            ...ImportAI.whole.head.link,
            ImportAI.whole.head.style.length > 0 ? `<style>${ImportAI.whole.head.style.join('\n')}</style>` : '',
            ImportAI.whole.head.title ? `<title>${ImportAI.whole.head.title}</title>` : ''
        ].join('\n');

        const bodyContent = Object.values(ImportAI.whole.body.section).join('\n');
        const scripts = ImportAI.whole.script.length > 0 ? `${ImportAI.whole.script.join('\n')}` : '';

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
    <head>
        ${headContent}
    </head>
    <body>
        ${bodyContent}
        ${scripts}
    </body>
</html>
        `;

        // Render the generated HTML content
        this.editorManager.clearEditor()
        this.editorManager.insertValue(htmlContent);
        this.editorManager.updatePreview();
    }
}

