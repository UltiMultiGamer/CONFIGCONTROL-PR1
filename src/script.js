import './style.css'

class terminal {
    constructor() {
        this.currPath = `C:\\>`;
        this.currentDir = [`C:`];
        this.cmdHistory = [];
        this.historyIndex = -1;
		this.vfsTree = { name: 'C:', children: {} };
		this.currentNode = this.vfsTree;
		this.env = { NAME: 'User', USER: 'User' };
        this.startupScript = null;
        this.params = this.parseURLParams();
        this.startTime = Date.now();
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
		this.env.PWD = this.currentDir.join("\\");
		this.currentNode = this.getNodeForParts(this.currentDir) || this.vfsTree;
		this.env.HOME = this.env.HOME || this.currentDir[0] + '\\';
		this.env.PATH = this.env.PATH || this.currentDir[0] + '\\';
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
        }
        if (path === ".") return true;
        if (path === "~" || path === "") {
            this.currentDir = [this.vfsTree.name];
            this.updatePath();
            return true;
        }
        const targetParts = this.resolvePathParts(path, this.currentDir);
        const node = this.getNodeForParts(targetParts);
        if (!node) return false;
        this.currentDir = targetParts;
        this.updatePath();
        return true;
    }

    parseURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            vfsPath: urlParams.get('vfs-path') || urlParams.get('--vfs-path'),
            scriptPath: urlParams.get('script-path') || urlParams.get('--script-path')
        };
    }

	async applyParameters() {
		if (this.params.vfsPath) {
			try {
				if (this.params.vfsPath.endsWith('.csv')) {
					this.writeOutput(`Loading VFS from: ${this.params.vfsPath}`);
					this.newLine();
					const response = await fetch(this.params.vfsPath);
					if (!response.ok) {
						throw new Error(`VFS file not found: ${this.params.vfsPath}`);
					}
					const csvContent = await response.text();
					const success = this.importVfsFromCsv(csvContent);
					if (success) {
						this.writeOutput("VFS loaded successfully!");
						this.newLine();
					} else {
						throw new Error("Invalid VFS file format");
					}
				} else {
					this.setRootFromPath(this.params.vfsPath);
					this.writeOutput(`VFS root set to: ${this.env.PWD}`);
					this.newLine();
				}
			} catch (error) {
				this.writeError(`Error loading VFS: ${error.message}`);
				this.newLine();
				this.vfsTree.name = this.vfsTree.name || 'C:';
				this.currentDir = [this.vfsTree.name];
				this.updatePath();
			}
		} else {
			this.vfsTree.name = this.vfsTree.name || 'C:';
			this.currentDir = [this.vfsTree.name];
			this.updatePath();
		}
		
		if (!this.env.HOME) this.env.HOME = this.env.PWD;
		if (!this.env.PATH) this.env.PATH = this.env.PWD;
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

	setRootFromPath(pathStr) {
		const parts = this.splitPath(pathStr);
		if (parts.length === 0) return;
		const drive = parts[0].includes(':') ? parts[0] : (this.vfsTree.name || 'C:');
		this.vfsTree.name = drive;
		this.currentDir = parts[0].includes(':') ? parts : [drive, ...parts];
		this.updatePath();
		this.env.HOME = this.env.PWD;
		this.env.PATH = this.env.PWD;
	}

    initFileLoader() {
        const loadButton = document.querySelector("#loadButton");
        const importButton = document.querySelector("#importButton");
        const fileInput = document.querySelector("#fileInput");
        
        loadButton.addEventListener("click", () => {
            fileInput.accept = ".vasi";
            fileInput.click();
        });
        
        importButton.addEventListener("click", () => {
            fileInput.accept = ".csv";
            fileInput.click();
        });
        
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file && file.name.endsWith('.vasi')) {
                this.loadScript(file);
            } else if (file && file.name.endsWith('.csv')) {
                this.importVfsFromFile(file);
            } else {
                this.writeOutput("Please select a .vasi or .csv file");
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

    async importVfsFromFile(file) {
        try {
            const content = await file.text();
            this.writeOutput(`Importing VFS from: ${file.name}`);
            this.newLine();
            
            const success = this.importVfsFromCsv(content);
            if (success) {
                this.writeOutput("VFS import completed!");
                this.newLine();
                this.writeOutput("Current VFS structure:");
                this.newLine();
                const lines = this.collectTreeLines(this.vfsTree, 0);
                for (const line of lines) {
                    this.writeOutput(`  ${line}`);
                    this.newLine();
                }
            } else {
                this.writeError("VFS import failed. Invalid CSV format.");
            }
            this.newLine();
        } catch (error) {
            this.writeError(`Error importing VFS: ${error.message}`);
            this.newLine();
        }
    }

    importVfsFromCsv(csvContent) {
        try {
            const lines = csvContent.trim().split('\n');
            if (lines.length < 2 || lines[0] !== 'path') {
                return false;
            }
            
            const paths = lines.slice(1).filter(line => line.trim());
            if (paths.length === 0) {
                return false;
            }
            
            this.vfsTree = { name: 'C:', children: {} };
            this.currentDir = [this.vfsTree.name];
            this.updatePath();
            
            for (const path of paths) {
                const parts = this.splitPath(path);
                if (parts.length > 0) {
                    this.createDir(parts);
                }
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }





    splitPath(input) {
        let s = input.replace(/\//g, '\\');
        s = s.replace(/^\\+/, '');
        const parts = s.split('\\').filter(p => p.length > 0).map(p => p.replace(/\\+$/,''));
        if (parts.length === 0) return [];
        if (parts[0].includes(':')) parts[0] = parts[0].split(':')[0] + ':';
        return parts;
    }

    buildTree(paths) {
        for (const parts of paths) {
            let idx = 0;
            let node = this.vfsTree;
            if (parts[0].includes(':')) idx = 1;
            for (let i = idx; i < parts.length; i++) {
                const name = parts[i];
                if (!node.children[name]) node.children[name] = { name, children: {} };
                node = node.children[name];
            }
        }
    }

    getNodeForParts(parts) {
        let node = this.vfsTree;
        let start = 0;
        if (parts[0] && parts[0].includes(':')) start = 1;
        for (let i = start; i < parts.length; i++) {
            const name = parts[i];
            if (!node.children[name]) return null;
            node = node.children[name];
        }
        return node;
    }

    collectTreeLines(node, level) {
        const lines = [];
        const indent = '  '.repeat(level);
        const names = Object.keys(node.children).sort();
        for (const name of names) {
            lines.push(`${indent}${name}`);
            const child = node.children[name];
            const childLines = this.collectTreeLines(child, level + 1);
            for (const l of childLines) lines.push(l);
        }
        return lines;
    }

    serializeCsv() {
        const rows = [];
        const root = this.vfsTree.name;
        const walk = (n, prefixParts) => {
            const names = Object.keys(n.children).sort();
            for (const name of names) {
                const next = n.children[name];
                const parts = [...prefixParts, name];
                rows.push(parts.join('\\'));
                walk(next, parts);
            }
        };
        walk(this.vfsTree, [root]);
        return ['path', ...rows].join('\n');
    }

	resolvePathParts(input, baseParts) {
		const raw = this.splitPath(input);
		let stack = baseParts.slice();
		if (raw[0] && raw[0].includes(':')) stack = [raw[0]];
		let i = raw[0] && raw[0].includes(':') ? 1 : 0;
		for (; i < raw.length; i++) {
			const p = raw[i];
			if (p === '.' || p === '') continue;
			if (p === '..') { if (stack.length > 1) stack.pop(); continue; }
			stack.push(p);
		}
		return stack;
	}

    createDir(parts) {
        let node = this.vfsTree;
        console.log(node)
        let start = 0;
        if (parts[0] && parts[0].includes(':')) start = 1;
        for (let i = start; i < parts.length; i++) {
            const name = parts[i];
            if (!node.children[name]) node.children[name] = { name, children: {} };
            node = node.children[name];
        }
        return true;
    }

    removeDir(parts) {
        if (parts.length <= 1) return false;
        const parents = [];
        let node = this.vfsTree;
        let start = 0;
        if (parts[0] && parts[0].includes(':')) start = 1;
        for (let i = start; i < parts.length; i++) {
            const name = parts[i];
            parents.push({ node, name });
            if (!node.children[name]) return false;
            node = node.children[name];
        }
        if (Object.keys(node.children).length > 0) return false;
        const last = parents[parents.length - 1];
        delete last.node.children[last.name];
        return true;
    }

    calculateDirSize(node) {
        let totalSize = 0;
        const childNames = Object.keys(node.children);
        
        for (const name of childNames) {
            const child = node.children[name];
            totalSize += this.calculateDirSize(child);
            totalSize += name.length * 2;
        }
        
        return totalSize;
    }

    calculateAbsoluteSize(node) {
        const csvData = this.serializeCsv();
        return new Blob([csvData], { type: 'text/csv' }).size;
    }

    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)}${units[unitIndex]}`;
    }



    async executeScript(scriptContent) {
        const rawLines = scriptContent.split('\n');
        const hasSilentFlag = rawLines.some(line => {
            const t = line.trim().toLowerCase();
            return t === '#silent';
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
        - ls [path]: List directory contents
        - pwd: Print current directory
        - tree [path]: Print directory tree
        - du [path] [--absolute]: Show disk usage of directories
        - exportvfs [--debug]: Export VFS as CSV file
        - mkdir <path>: Create directory
        - rmdir <path>: Remove empty directory
        - whoami: Show current user
        - uptime: Show terminal uptime
        - clear: Clear terminal
        - echo <text>: Print text to terminal (supports $VARIABLE substitution)
        - request <method> <url> [options]: Make HTTP requests
        - load <filename>: Load and execute a .vasi script file
        - exit: Close the terminal

URL Parameters:
        - ?vfs-path=<path>: Set VFS root directory or load CSV file
        - ?script-path=<file>: Auto-execute startup script
        - Example: ?vfs-path=vfs_export.csv&script-path=startup.vasi`;
            this.writeOutput(helpText);
            this.newLine();
        },

        cd: (args) => {
            const path = args[0] || '~';
			if (this.navigateTo(path)) {
                this.writeOutput(`Changed directory to: ${this.currentDir.join("\\")}`);
            } else {
                if (path === '..') {
                    this.writeOutput(`Cannot go up from root directory`);
                } else {
                    this.writeError(`Path not found`);
                }
            }
            this.newLine();
        },

        ls: (args) => {
            const path = args[0];
            const parts = path ? this.resolvePathParts(path, this.currentDir) : this.currentDir.slice();
            const node = this.getNodeForParts(parts);
            if (!node) {
                this.writeError("Path not found");
                this.newLine();
                return;
            }
            const names = Object.keys(node.children).sort();
            this.writeOutput(names.join("  "));
            this.newLine();
        },

        mkdir: (args) => {
            if (args.length === 0) {
                this.writeOutput("Usage: mkdir <path>");
                this.newLine();
                return;
            }
            const parts = this.resolvePathParts(args[0], this.currentDir);
            this.createDir(parts);
            this.writeOutput("Directory created");
            this.newLine();
        },

        rmdir: (args) => {
            if (args.length === 0) {
                this.writeOutput("Usage: rmdir <path>");
                this.newLine();
                return;
            }
            const parts = this.resolvePathParts(args[0], this.currentDir);
            if (parts.length <= 1) {
                this.writeError("Cannot remove root");
                this.newLine();
                return;
            }
            const ok = this.removeDir(parts);
            if (!ok) {
                this.writeError("Directory not empty or not found");
            } else {
                this.writeOutput("Directory removed");
            }
            this.newLine();
        },

        pwd: (args) => {
            this.writeOutput(this.currentDir.join("\\"));
            this.newLine();
        },

        tree: (args) => {
            const path = args[0];
            const parts = path ? this.resolvePathParts(path, this.currentDir) : this.currentDir.slice();
            const node = this.getNodeForParts(parts);
            if (!node) {
                this.writeError("Path not found");
                this.newLine();
                return;
            }
            const lines = this.collectTreeLines(node, 0);
            for (const line of lines) {
                this.writeOutput(line);
                this.newLine();
            }
        },

        du: (args) => {
            const hasAbsoluteFlag = args.includes('--absolute');
            const path = args.find(arg => !arg.startsWith('--'));
            const parts = path ? this.resolvePathParts(path, this.currentDir) : this.currentDir.slice();
            const node = this.getNodeForParts(parts);
            if (!node) {
                this.writeError("Path not found");
                this.newLine();
                return;
            }
            
            const childNames = Object.keys(node.children).sort();
            let totalSize = 0;
            
            if (hasAbsoluteFlag) {
                const fullCsvSize = this.calculateAbsoluteSize(this.vfsTree);
                for (const name of childNames) {
                    const child = node.children[name];
                    const childCsvSize = this.calculateAbsoluteSize(child);
                    totalSize += childCsvSize;
                    this.writeOutput(`${this.formatSize(childCsvSize).padStart(8)} ${name}`);
                    this.newLine();
                }
                this.writeOutput(`${this.formatSize(fullCsvSize).padStart(8)} total`);
                this.newLine();
            } else {
                for (const name of childNames) {
                    const child = node.children[name];
                    const size = this.calculateDirSize(child);
                    totalSize += size;
                    this.writeOutput(`${this.formatSize(size).padStart(8)} ${name}`);
                    this.newLine();
                }
                if (childNames.length > 0) {
                    this.writeOutput(`${this.formatSize(totalSize).padStart(8)} total`);
                    this.newLine();
                } else {
                    this.writeOutput("No subdirectories found");
                    this.newLine();
                }
            }
        },

        whoami: (args) => {
            this.writeOutput(this.env.USER || this.env.NAME || 'User');
            this.newLine();
        },

        uptime: (args) => {
            const uptimeMs = Date.now() - this.startTime;
            const seconds = Math.floor(uptimeMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            let uptimeStr = '';
            if (days > 0) uptimeStr += `${days} day${days > 1 ? 's' : ''}, `;
            if (hours % 24 > 0) uptimeStr += `${hours % 24} hour${(hours % 24) > 1 ? 's' : ''}, `;
            if (minutes % 60 > 0) uptimeStr += `${minutes % 60} minute${(minutes % 60) > 1 ? 's' : ''}, `;
            uptimeStr += `${seconds % 60} second${(seconds % 60) > 1 ? 's' : ''}`;
            
            this.writeOutput(`Terminal uptime: ${uptimeStr}`);
            this.newLine();
        },

        exportvfs: (args) => {
            const hasDebugFlag = args.includes('--debug');
            const csvData = this.serializeCsv();
            
            let exportData, fileName, mimeType;
            
            if (hasDebugFlag) {
                const csvSize = this.calculateAbsoluteSize(this.vfsTree);
                
                exportData = `=== VFS Structure Analysis ===

VFS Tree Structure:
${this.collectTreeLines(this.vfsTree, 0).map(line => `  ${line}`).join('\n')}

Size Calculations:
  CSV export size: ${this.formatSize(csvSize)}

CSV Data:
${csvData}`;
                fileName = 'vfs_analysis.txt';
                mimeType = 'text/plain;charset=utf-8;';
            } else {
                exportData = csvData;
                fileName = 'vfs_export.csv';
                mimeType = 'text/csv;charset=utf-8;';
            }

            const blob = new Blob([exportData], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 0);
            
            this.writeOutput(`Exported VFS to ${fileName}`);
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