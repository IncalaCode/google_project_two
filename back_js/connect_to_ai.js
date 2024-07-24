import { GoogleGenerativeAI } from "@google/generative-ai";
import * as sketchpad from './sekechpad.js';
import NotyfService from "./message.shower.js";

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
    }

    constructor() {
        this.genAI = new GoogleGenerativeAI("AIzaSyDTYPNXHwNE5nA5-uHRnBhS_mCXJSoDHXQ"); // Replace with your actual API key
        // The Gemini 1.5 models are versatile and work with both text-only and multimodal prompts
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    // Function to convert a base64-encoded image string to a GoogleGenerativeAI.Part object
    async fileToGenerativePart(imageDataUrl) {
        // Split the base64-encoded data from the data URL
        const base64EncodedData = imageDataUrl.split(',')[1];

        // Determine the MIME type from the data URL
        const mimeType = imageDataUrl.split(':')[1].split(';')[0];

        // Return GenerativeAI.Part object with inline data
        return {
            inlineData: { data: base64EncodedData, mimeType: mimeType },
        };
    }

    async generate() {
        console.log('Debug Info:', sketchpad.strokes, sketchpad.sections, ImportAI.whole);

        // Extract the last stroke and its associated image data
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
        3. Before an insert action, check that the it update or delelet by checking  that it postion of the object and seaeching
        from the history frist and if it doesnt exiest conrinue as insert otherwise take the object name and retuen it in update formate or delecte formate.
        Use this format for insert:
        {
            "html_code": {
                "html": "html_code_here",
                "style": "object_css_code",
                "script": "object_script_code with their tags",
                "link": "object_link_code with their tags"
            },
            "position": {
                "top": object_top
            },
            "action": "insert",
            "object_name": "object_name"
            "image_decription":
        }

        Use this format for update:
        {
            "html_code": {
                "html": "html_code_here",
                "style": "object_css_code",
                "script": "object_script_code with their tags",
                "link": "object_link_code with their tags"
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
            // Generate content using the prompt and image
            var result = await this.model.generateContent([prompt, image]);

            // Extract text response from the result
            const responseText = await result.response.text();
            result = this.parseJsonFromText(responseText)
            console.log('Generated Content:', result);

            this.applyChanges(result, lastStrokeIndex)

            return this.joinlist();
        } catch (error) {
            console.error('Error generating content:', error);
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
                NotyfService.showMessage("error", 'Unknown action:' + generatedContent.action, false);
        }
    }


    insertElement(generatedContent, lastStrokeIndex, update_object) {
        ImportAI.whole.body.section[update_object || `${lastStrokeIndex}`] = generatedContent.html_code.html
        ImportAI.whole.head.link[update_object || `${lastStrokeIndex}`] = generatedContent.html_code.link
        ImportAI.whole.head.style[update_object || `${lastStrokeIndex}`] = generatedContent.html_code.style
        ImportAI.whole.script[update_object || `${lastStrokeIndex}`] = generatedContent.html_code.script
        ImportAI.whole.head.style[update_object || `${lastStrokeIndex}`] = generatedContent.html_code.style
    }
    updateElement(generatedContent, lastStrokeIndex) {
        this.insertElement(generatedContent, lastStrokeIndex, generatedContent.object_name)
    }
    deleteElement(generatedContent, lastStrokeIndex) {
        ImportAI.whole.body.section[update_object || `${lastStrokeIndex}`] = ""
        ImportAI.whole.head.link[update_object || `${lastStrokeIndex}`] = ""
        ImportAI.whole.head.style[update_object || `${lastStrokeIndex}`] = ""
        ImportAI.whole.script[update_object || `${lastStrokeIndex}`] = ""
        ImportAI.whole.head.style[update_object || `${lastStrokeIndex}`] = ""
    }


    parseJsonFromText(text) {
        try {
            const startIndex = text.indexOf('{');
            const endIndex = text.lastIndexOf('}');
            const trimmedJsonData = text.substring(startIndex, endIndex + 1);
            const parsedData = JSON.parse(trimmedJsonData.trim());
            return parsedData;
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
        const hover_color = $('#color4').val();

        const collectedValues = {
            framework,
            customFrameworkInput,
            colors: {
                back_ground_color,
                border_color,
                button_color,
                hover_color
            }
        };

        console.log('Collected Values:', collectedValues);
        return collectedValues
        // You can perform any action with the collected values here
    }


    joinlist() {
        const headContent = [
            ...ImportAI.whole.head.meta,
            ...ImportAI.whole.head.link,
            ImportAI.whole.head.style.length > 0 ? `<style>${ImportAI.whole.head.style.join('\n')}</style>` : '',
            ImportAI.whole.head.title ? `<title>${ImportAI.whole.head.title}</title>` : ''
        ].join('\n');

        const bodyContent = Object.values(ImportAI.whole.body.section).join('\n');
        const scripts = ImportAI.whole.script.length > 0 ? `<script>${ImportAI.whole.script.join('\n')}</script>` : '';

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
        document.getElementById('render').innerHTML = htmlContent;
    }

}