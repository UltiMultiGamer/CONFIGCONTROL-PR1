import './style.css'

class terminal {
    constructor() {
        this.currPath = `C:\\>`;
        this.currentDir = [`C:`];
        this.cmdHistory = [];
        this.historyIndex = -1;
        this.env = {
            NAME: 'User',
            USER: 'User',
            PATH: 'C:\\',
            PWD: 'C:\\',
            HOME: 'C:\\'
        };
        this.vfsRoot = 'C:\\';
        this.startupScript = null;
        this.params = this.parseURLParams();
        this.init();
    }

    async init() {
        const terminal = document.querySelector("#terminal");
        this.initListeners(terminal)
        this.initFileLoader()
        await this.applyParameters()
    }

    initListeners(el) {
        el.addEventListener("keydown", (e) => {
            const isModifierKey = e.ctrlKey || e.metaKey || e.altKey;
            const isNavigationKey = e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End" || e.key === "PageUp" || e.key === "PageDown";
            const isSpecialKey = e.key === "Tab" || e.key === "Escape" || e.key === "F1" || e.key === "F2" || e.key === "F3" || e.key === "F4" || e.key === "F5" || e.key === "F6" || e.key === "F7" || e.key === "F8" || e.key === "F9" || e.key === "F10" || e.key === "F11" || e.key === "F12";
            
            if (e.key === "ArrowUp") {
                e.preventDefault();
                this.navigateHistory(el, 'up');
                this.scrollToBottom(el);
                return;
            }
            
            if (e.key === "ArrowDown") {
                e.preventDefault();
                this.navigateHistory(el, 'down');
                this.scrollToBottom(el);
                return;
            }
            
            if (isModifierKey || isSpecialKey || isNavigationKey) {
                this.scrollToBottom(el);
                return;
            }

            const cursorPos = el.selectionStart;
            const selectionStart = el.selectionStart;
            const selectionEnd = el.selectionEnd;
            const hasSelection = selectionEnd > selectionStart;
            const lines = el.value.split('\n');
            const currentLineIdx = this.getCurrentLineNumber(el, cursorPos);
            const lastLineIdx = lines.length - 1;
            const lastNewline = el.value.lastIndexOf('\n');
            const lastLineStart = lastNewline === -1 ? 0 : lastNewline + 1;
            const promptBoundary = lastLineStart + this.currPath.length;
            const col = this.getLineColumn(el, cursorPos);

            if (currentLineIdx < lastLineIdx) {
                el.setSelectionRange(el.value.length, el.value.length);
            }

            if (currentLineIdx === lastLineIdx && col <= this.currPath.length) {
                if (e.key === "Home") {
                    el.setSelectionRange(promptBoundary, promptBoundary);
                    e.preventDefault();
                } else if (e.key === "ArrowLeft" && cursorPos <= promptBoundary) {
                    el.setSelectionRange(promptBoundary, promptBoundary);
                    e.preventDefault();
                } else if (e.key === "Backspace" || e.key === "Delete") {
                    if (!(hasSelection && selectionStart >= promptBoundary)) {
                        el.setSelectionRange(promptBoundary, promptBoundary);
                        e.preventDefault();
                    }
                }
            }

            if (e.key === "Enter") {
                e.preventDefault()
                const command = this.getCmd(el);
                this.cmdManager(command).then(() => {
                    this.newLine();
                    this.writeDir(el);
                });
            }

            this.scrollToBottom(el);
        })

        el.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
                e.preventDefault();
                const lastNewline = el.value.lastIndexOf('\n');
                const lastLineStart = lastNewline === -1 ? 0 : lastNewline + 1;
                const promptBoundary = lastLineStart + this.currPath.length;
                el.setSelectionRange(promptBoundary, el.value.length);
                this.scrollToBottom(el);
            }
        })


        el.addEventListener("paste", (e) => {
            const cursorPos = el.selectionStart;
            const lines = el.value.split('\n');
            const currentLineIdx = this.getCurrentLineNumber(el, cursorPos);
            const lastLineIdx = lines.length - 1;
            const lastNewline = el.value.lastIndexOf('\n');
            const lastLineStart = lastNewline === -1 ? 0 : lastNewline + 1;
            const promptBoundary = lastLineStart + this.currPath.length;
            const col = this.getLineColumn(el, cursorPos);

            if (currentLineIdx < lastLineIdx) {
                el.setSelectionRange(el.value.length, el.value.length);
            } else if (col < this.currPath.length) {
                el.setSelectionRange(promptBoundary, promptBoundary);
            }
            this.scrollToBottom(el);
        })



        el.addEventListener("change", (e) => {
            console.log("change detected")
            this.scrollToBottom(el)
        })
    }

    getCurrentLineNumber(el, cursorPos) {
        const before = el.value.substring(0, cursorPos);
        return before.split('\n').length - 1;
    }

    getLineColumn(el, cursorPos) {
        const lastNewline = el.value.lastIndexOf('\n', cursorPos - 1);
        return cursorPos - (lastNewline + 1);
    }

    scrollToBottom(el) {
        el.scrollTop = el.scrollHeight;
    }

    getCmd(el) {
        const lines = el.value.split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            if (line.startsWith(this.currPath)) {
                return line.replace(this.currPath, '').trim();
            }
        }
        return '';
    }

    async cmdManager(command, isScriptExecution = false) {
        const trimmedCommand = command.trim();

        if (!trimmedCommand) {
            return Promise.resolve();
        }

        this.cmdHistory.push(trimmedCommand);
        this.historyIndex = this.cmdHistory.length;

        this.newLine();
        const [cmd, ...args] = trimmedCommand.split(' ');
        if (this.commands[cmd]) {
            try {
                const result = this.commands[cmd](args);
                return result instanceof Promise ? result : Promise.resolve();
            } catch (error) {
                this.writeError(`Error: ${error.message}`);
                this.newLine();
                if (isScriptExecution) {
                    throw error;
                }
            }
        } else {
            const errorMsg = `${cmd} is not recognized as a internal command, try running 'help' to get a list of available commands`;
            this.writeError(errorMsg);
            this.newLine();
            if (isScriptExecution) {
                throw new Error(errorMsg);
            }
        }
    }



    newLine() {
        this.writeOutput('\n');
    }


    writeOutput(text, el = null) {
        const terminal = el || document.querySelector("#terminal");
        terminal.value += text;
        terminal.focus();
        terminal.setSelectionRange(terminal.value.length, terminal.value.length);
        this.scrollToBottom(terminal)
    }

    writeError(text, el = null) {
        this.writeOutput(`[ERROR] ${text}`, el);
    }

    writeDir(el = null) {
        this.writeOutput(this.currPath, el);
    }

    updatePath() {
        this.currPath = this.currentDir.join("\\") + "\\>";
    }

    substituteEnvVars(text) {
        return text.replace(/\$(\w+)/g, (match, varName) => {
            return this.env[varName] || match;
        });
    }

    navigateHistory(el, direction) {
        if (this.cmdHistory.length === 0) {
            return;
        }

        const lines = el.value.split('\n');
        // const lastLineIdx = lines.length - 1;
        const lastNewline = el.value.lastIndexOf('\n');
        const lastLineStart = lastNewline === -1 ? 0 : lastNewline + 1;
        const promptBoundary = lastLineStart + this.currPath.length;

        if (direction === 'up') {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                const command = this.cmdHistory[this.historyIndex];
                const newValue = el.value.substring(0, promptBoundary) + command;
                el.value = newValue;
                el.setSelectionRange(el.value.length, el.value.length);
            }
        } else if (direction === 'down') {
            if (this.historyIndex < this.cmdHistory.length - 1) {
                this.historyIndex++;
                const command = this.cmdHistory[this.historyIndex];
                const newValue = el.value.substring(0, promptBoundary) + command;
                el.value = newValue;
                el.setSelectionRange(el.value.length, el.value.length);
            } else if (this.historyIndex === this.cmdHistory.length - 1) {
                this.historyIndex = this.cmdHistory.length;
                const newValue = el.value.substring(0, promptBoundary);
                el.value = newValue;
                el.setSelectionRange(el.value.length, el.value.length);
            }
        }
    }

    navigateTo(path) {
        if (path === "..") {
            if (this.currentDir.length > 1) {
                this.currentDir.pop();
                this.updatePath();
                return true;
            }
            return false;
        } else if (path === ".") {
            return true;
        } else if (path === "~" || path === "") {
            this.currentDir = [this.vfsRoot];
            this.updatePath();
            return true;
        } else {
            this.currentDir.push(path);
            this.updatePath();
            return true;
        }
    }

    parseURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            vfsPath: urlParams.get('vfs-path') || urlParams.get('--vfs-path'),
            scriptPath: urlParams.get('script-path') || urlParams.get('--script-path')
        };
    }

    async applyParameters() {

        // this.writeOutput("Debug output parameters:");
        // this.newLine();
        // this.writeOutput(`  VFS Root: ${this.params.vfsPath || 'C:\\ (default)'}`);
        // this.newLine();
        // this.writeOutput(`  Startup Script: ${this.params.scriptPath || 'None'}`);
        // this.newLine();
        // this.newLine();

        if (this.params.vfsPath) {
            this.vfsRoot = this.params.vfsPath;
            this.currentDir = [this.vfsRoot];
            this.env.PWD = this.vfsRoot;
            this.env.HOME = this.vfsRoot;
            this.updatePath();
            this.writeOutput(`VFS root set to: ${this.vfsRoot}`);
            this.newLine();
        }
        this.writeOutput("Terminal ready. Type 'help' for available commands.");
        this.newLine();
        if (this.params.scriptPath) {
            this.startupScript = this.params.scriptPath;
            this.writeOutput(`Loading startup script: ${this.startupScript}`);
            this.newLine();
            this.writeOutput("Executing startup script...");
            this.newLine();
            this.newLine();
            
            try {
                const response = await fetch(this.startupScript);
                if (!response.ok) {
                    throw new Error(`Startup script not found: ${this.startupScript}`);
                }
                const content = await response.text();
                const ok = await this.executeScript(content);
                if (ok) {
                    this.writeOutput("Startup script completed!");
                } else {
                    this.writeError("Startup script failed.");
                }
                this.newLine();
            } catch (error) {
                this.writeError(`Error loading startup script: ${error.message}`);
                this.newLine();
            }
        }
        this.writeDir();
    }

    initFileLoader() {
        const loadButton = document.querySelector("#loadButton");
        const fileInput = document.querySelector("#fileInput");
        
        loadButton.addEventListener("click", () => {
            fileInput.click();
        });
        
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file && file.name.endsWith('.vasi')) {
                this.loadScript(file);
            } else {
                this.writeOutput("Please select a .vasi file");
                this.newLine();
            }
        });
    }

    async loadScript(file) {
        try {
            const content = await file.text();
            this.writeOutput(`Loading script: ${file.name}`);
            this.newLine();
            this.writeOutput("Executing script...");
            this.newLine();
            this.newLine();
            
            const ok = await this.executeScript(content);
            if (ok) {
                this.writeOutput("Script execution completed!");
            } else {
                this.writeError("Script execution failed.");
            }
            this.newLine();
        } catch (error) {
            this.writeError(`Error loading script: ${error.message}`);
            this.newLine();
        }
    }



    async executeScript(scriptContent) {
        const rawLines = scriptContent.split('\n');
        const hasSilentFlag = rawLines.some(line => {
            const t = line.trim().toLowerCase();
            return t === 'silent' || t === '#silent' || t === '# silent' || t === '@silent';
        });
        const commands = rawLines
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#') && line.toLowerCase() !== 'silent' && line.toLowerCase() !== '@silent');

        for (const command of commands) {
            try {
                if (!hasSilentFlag) {
                    this.writeDir();
                    this.writeOutput(command);
                }
                await this.cmdManager(command, true);
            } catch (error) {
                return false;
            }
        }
        return true;
    }

    commands = {
        help: (args) => {
            const helpText = 
        `Available commands:
        - help: Show this help message
        - cd <path>: Change directory
        - ls: List directory contents
        - clear: Clear terminal
        - echo <text>: Print text to terminal (supports $VARIABLE substitution)
        - request <method> <url> [options]: Make HTTP requests
        - load <filename>: Load and execute a .vasi script file
        - exit: Close the terminal

URL Parameters:
        - ?vfs-path=<path>: Set VFS root directory
        - ?script-path=<file>: Auto-execute startup script
        - Example: ?vfs-path=D:\\&script-path=startup.vasi`;
            this.writeOutput(helpText);
            this.newLine();
        },

        cd: (args) => {
            const path = args[0] || '~';
            if (this.navigateTo(path)) {
                this.writeOutput(`Changed directory to: ${this.currentDir.join("\\")}`);
            } else {
                this.writeOutput(`Cannot go up from root directory`);
            }
            this.newLine();
        },

        ls: (args) => {
            this.writeOutput('not implemented but pretend something is here');
            this.newLine();
        },

        clear: (args) => {
            const terminal = document.querySelector("#terminal");
            terminal.value = '';
            this.writeDir(terminal);
        },

        echo: (args) => {
            if (args.length === 0) {
                this.writeOutput('');
            } else {
                const text = args.join(' ');
                const substitutedText = this.substituteEnvVars(text);
                this.writeOutput(substitutedText);
            }
            this.newLine();
        },

        request: async (args) => {
            if (args.length < 2) {
                this.writeOutput(`Usage: request [method] [url] [body] [--header "key:value"] [--query "key=value"]`);
                this.newLine();
                this.writeOutput(`Examples:`);
                this.newLine();
                this.writeOutput(`  request GET https://api.github.com/users/octocat`);
                this.newLine();
                this.writeOutput(`  request POST https://httpbin.org/post --header "Content-Type:application/json" --body '{"name":"test"}'`);
                this.newLine();
                this.writeOutput(`  request GET https://httpbin.org/get --query "param1=value1&param2=value2"`);
                this.newLine();
                return;
            }

            const method = args[0].toUpperCase();
            let url = args[1];
            let body = null;
            const headers = {};
            const queryParams = {};

            for (let i = 2; i < args.length; i++) {
                if (args[i] === '--header' && i + 1 < args.length) {
                    const header = args[i + 1];
                    const colonIndex = header.indexOf(':');
                    if (colonIndex > 0) {
                        const key = header.substring(0, colonIndex).trim();
                        const value = header.substring(colonIndex + 1).trim();
                        headers[key] = value;
                    }
                    i++;
                } else if (args[i] === '--query' && i + 1 < args.length) {
                    const queryString = args[i + 1];
                    queryString.split('&').forEach(param => {
                        const [key, value] = param.split('=');
                        if (key && value) {
                            queryParams[key] = value;
                        }
                    });
                    i++;
                } else if (args[i] === '--body' && i + 1 < args.length) {
                    body = args[i + 1];
                    i++;
                } else if (!args[i].startsWith('--')) {
                    body = args[i];
                }
            }

            if (Object.keys(queryParams).length > 0) {
                const urlObj = new URL(url);
                Object.keys(queryParams).forEach(key => {
                    urlObj.searchParams.append(key, queryParams[key]);
                });
                url = urlObj.toString();
            }

            try {
                this.writeOutput(`Making ${method} request to: ${url}`);
                this.newLine();
                
                const requestOptions = {
                    method: method,
                    headers: headers
                };

                if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                    if (headers['Content-Type'] && headers['Content-Type'].includes('application/json')) {
                        requestOptions.body = body;
                    } else {
                        requestOptions.body = body;
                    }
                }

                const response = await fetch(url, requestOptions);
                const responseText = await response.text();
                
                this.writeOutput(`Status: ${response.status} ${response.statusText}`);
                this.newLine();
                this.writeOutput(`Headers:`);
                this.newLine();
                response.headers.forEach((value, key) => {
                    this.writeOutput(`  ${key}: ${value}`);
                    this.newLine();
                });
                this.writeOutput(`Response Body:`);
                this.newLine();
                
                try {
                    const jsonResponse = JSON.parse(responseText);
                    this.writeOutput(JSON.stringify(jsonResponse, null, 2));
                } catch {
                    this.writeOutput(responseText);
                }
                this.newLine();
                
            } catch (error) {
                this.writeError(`Request failed: ${error.message}`);
                this.newLine();
            }
        },

        load: async (args) => {
            if (args.length === 0) {
                this.writeOutput("Usage: load <filename.vasi>");
                this.newLine();
                this.writeOutput("Examples:");
                this.newLine();
                this.writeOutput("  load myscript.vasi                    # Local file");
                this.newLine();
                this.writeOutput("  load https://example.com/script.vasi  # Public URL");
                this.newLine();
                this.writeOutput("  load ./scripts/test.vasi              # Relative path");
                this.newLine();
                return;
            }

            const filename = args[0];
            if (!filename.endsWith('.vasi')) {
                this.writeOutput("Please provide a .vasi file");
                this.newLine();
                return;
            }

            this.writeOutput(`Loading script: ${filename}`);
            this.newLine();

            try {
                const response = await fetch(filename);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error(`File not found: ${filename}. Make sure the file exists and is accessible.`);
                    } else if (response.status === 403) {
                        throw new Error(`Access denied: ${filename}. File may be private or require authentication.`);
                    } else if (response.status >= 500) {
                        throw new Error(`Server error (${response.status}): ${filename}. The server is having issues.`);
                    } else {
                        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
                    }
                }

                const contentType = response.headers.get('content-type');
                if (contentType && !contentType.includes('text/') && !contentType.includes('application/')) {
                    this.writeOutput(`Warning: Unexpected content type: ${contentType}`);
                    this.newLine();
                }

                const content = await response.text();
                
                if (!content || content.trim().length === 0) {
                    throw new Error(`File is empty: ${filename}`);
                }

                if (content.trim().toLowerCase().startsWith('<!doctype') || 
                    content.trim().toLowerCase().startsWith('<html') ||
                    content.includes('<html') ||
                    content.includes('<!DOCTYPE')) {
                    throw new Error(`File appears to be HTML, not a .vasi script: ${filename}. This might be a 404 error page.`);
                }


                this.writeOutput("File loaded successfully. Executing script...");
                this.newLine();
                this.newLine();
                
                const ok = await this.executeScript(content);
                if (ok) {
                    this.writeOutput("Script execution completed!");
                } else {
                    this.writeOutput("Script execution failed.");
                }
                this.newLine();
            } catch (error) {
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    this.writeError(`Network error: Cannot reach ${filename}`);
                    this.newLine();
                    this.writeOutput("Check if:");
                    this.newLine();
                    this.writeOutput("  - The URL is correct and publicly accessible");
                    this.newLine();
                    this.writeOutput("  - The file exists in the current directory");
                    this.newLine();
                    this.writeOutput("  - You have internet connection (for URLs)");
                    this.newLine();
                } else {
                    this.writeError(`Error loading script: ${error.message}`);
                    this.newLine();
                }
            }
        },

        exit: (args) => {
            this.writeOutput('Bye!!!...');
            this.newLine();

            
            const terminal = document.querySelector("#terminal");
            terminal.classList.add('terminal-exit');
            
            setTimeout(() => {
                terminal.style.display = 'none';
                document.body.innerHTML = '<div class="deactivated" style="display: flex; justify-content: center; align-items: center;"><h1>Terminal has exited...</h1></div>';
            }, 2000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const terminalInstance = new terminal();
});