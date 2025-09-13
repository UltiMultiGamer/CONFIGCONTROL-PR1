class terminal {
    constructor() {
        this.currPath = `C:`;
        this.currentDir = [`C:`];
        this.cmdHistory = [];
        this.env = {
            NAME: 'User',
            USER: 'User',
            PATH: 'C:\\',
            PWD: 'C:',
            HOME: 'C:'
        };
        this.init();
    }

    init() {
        const terminal = document.querySelector("#terminal");
        this.initListeners(terminal)
        this.writeDir(terminal)
    }

    initListeners(el) {
        el.addEventListener("keydown", (e) => {
            const isModifierKey = e.ctrlKey || e.metaKey || e.altKey;
            const isNavigationKey = e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End" || e.key === "PageUp" || e.key === "PageDown";
            const isSpecialKey = e.key === "Tab" || e.key === "Escape" || e.key === "F1" || e.key === "F2" || e.key === "F3" || e.key === "F4" || e.key === "F5" || e.key === "F6" || e.key === "F7" || e.key === "F8" || e.key === "F9" || e.key === "F10" || e.key === "F11" || e.key === "F12";
            
            if (isModifierKey || isSpecialKey) {
                this.scrollToBottom(el);
                return;
            }

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
            }

            if (currentLineIdx === lastLineIdx && col <= this.currPath.length) {
                if (e.key === "Home") {
                    el.setSelectionRange(promptBoundary, promptBoundary);
                    e.preventDefault();
                } else if (e.key === "ArrowLeft" && cursorPos <= promptBoundary) {
                    el.setSelectionRange(promptBoundary, promptBoundary);
                    e.preventDefault();
                } else if (e.key === "Backspace") {
                    el.setSelectionRange(promptBoundary, promptBoundary);
                    e.preventDefault();
                } else if (e.key === "Delete") {
                    el.setSelectionRange(promptBoundary, promptBoundary);
                    e.preventDefault();
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

    async cmdManager(command) {
        const trimmedCommand = command.trim();

        if (!trimmedCommand) {
            return Promise.resolve();
        }

        this.newLine();
        const [cmd, ...args] = trimmedCommand.split(' ');
        if (this.commands[cmd]) {
            const result = this.commands[cmd](args);
            return result instanceof Promise ? result : Promise.resolve();
        } else {
            this.writeOutput(`${cmd} is not recognized as a internal command, try running 'help' to get a list of available commands`);
            return Promise.resolve();
        }
    }



    newLine() {
        this.writeOutput('\n');
    }


    writeOutput(text, el = null) {
        const terminal = el || document.querySelector("#terminal");
        terminal.value += text;
    }

    writeDir(el = null) {
        this.writeOutput(this.currPath, el);
    }

    updatePath() {
        this.currPath = this.currentDir.join("\\") + " ";
    }

    substituteEnvVars(text) {
        return text.replace(/\$(\w+)/g, (match, varName) => {
            return this.env[varName] || match;
        });
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
            this.currentDir = ["C:"];
            this.updatePath();
            return true;
        } else {
            this.currentDir.push(path);
            this.updatePath();
            return true;
        }
    }

    commands = {
        help: (args) => {
            const helpText = `Available commands:
        - help: Show this help message
        - cd <path>: Change directory
        - ls: List directory contents
        - clear: Clear terminal
        - echo <text>: Print text to terminal (supports $VARIABLE substitution)
        - request <method> <url> [options]: Make HTTP requests
        - exit: Close the terminal with a spinning animation`;
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
                this.writeOutput(`Request failed: ${error.message}`);
                this.newLine();
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