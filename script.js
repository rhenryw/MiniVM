// © 2025 rhw/https://rhw.one | MiniVM

class DSLLinuxVM {
    constructor() {
        this.emulator = null;
        this.isVMStarted = false;
        this.isPaused = false;
        this.isFullscreen = false;
        this.selectedIsoSource = 'hosted'; 
        this.localIsoFile = null;
        this.localIsoUrl = null;
        this.hostedIsoAvailable = null;
        
        this.initializeParticles();
        this.bindEvents();
        this.initializeApp();
    }

    initializeParticles() {
        particlesJS('particles-js', {
            particles: {
                number: {
                    value: 100,
                    density: {
                        enable: true,
                        value_area: 800
                    }
                },
                color: {
                    value: '#000000'
                },
                shape: {
                    type: 'circle'
                },
                opacity: {
                    value: 0.5,
                    random: false
                },
                size: {
                    value: 3,
                    random: true
                },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: '#000000',
                    opacity: 0.4,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: 'none',
                    random: false,
                    straight: false,
                    out_mode: 'out',
                    bounce: false
                }
            },
            interactivity: {
                detect_on: 'canvas',
                events: {
                    onhover: {
                        enable: true,
                        mode: 'repulse'
                    },
                    onclick: {
                        enable: true,
                        mode: 'push'
                    },
                    resize: true
                }
            },
            retina_detect: true
        });
    }

    bindEvents() {
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        document.getElementById('screen_container').addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        document.getElementById('screen_container').addEventListener('click', () => {
            if (this.isVMStarted && this.isFullscreen) {
                document.getElementById('screen_container').requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            const container = document.getElementById('screen_container');
            if (document.pointerLockElement === container) {
                console.log('Pointer locked - mouse should now be in sync');
            } else {
                console.log('Pointer unlocked');
            }
        });
    }

    handleFullscreenChange() {
        this.isFullscreen = !!document.fullscreenElement;
        
        if (!this.isFullscreen && this.isVMStarted && !this.isPaused) {
            this.showPauseDialog();
        } else if (!this.isFullscreen && !this.isPaused) {
            this.exitVM();
        }
    }

    handleKeyPress(e) {
        if (e.key === 'Escape' && this.isFullscreen && this.isVMStarted && !this.isPaused) {
            e.preventDefault();
            this.showPauseDialog();
        }
    }

    updateStatus(message) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerHTML = message;
        }
    }

    updateButton(text, disabled = false) {
        const button = document.getElementById('startButton');
        if (button) {
            button.innerHTML = text;
            button.disabled = disabled;
        }
    }

    showDownloadProgress() {
        const progressContainer = document.getElementById('vmDownloadProgressContainer');
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
    }

    hideDownloadProgress() {
        const progressContainer = document.getElementById('vmDownloadProgressContainer');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    updateDownloadProgress(data) {
        const { loaded, total, lengthComputable } = data;
        
        if (!lengthComputable || !total) {
        
            const progressText = document.getElementById('vmProgressText');
            const progressPercentage = document.getElementById('vmProgressPercentage');
            
            if (progressText) progressText.textContent = 'Downloading DSL Linux ISO...';
            if (progressPercentage) progressPercentage.textContent = '...';
            return;
        }

        const percentage = Math.round((loaded / total) * 100);
        const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
        const totalMB = (total / (1024 * 1024)).toFixed(0);

        const progressFill = document.getElementById('vmProgressFill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }

        const progressPercentage = document.getElementById('vmProgressPercentage');
        if (progressPercentage) {
            progressPercentage.textContent = `${percentage}%`;
        }

        const progressLoaded = document.getElementById('vmProgressLoaded');
        const progressTotal = document.getElementById('vmProgressTotal');
        
        if (progressLoaded) {
            progressLoaded.textContent = `${loadedMB} MB`;
        }
        if (progressTotal) {
            progressTotal.textContent = `of ${totalMB} MB`;
        }

        this.updateStatus(`Downloading DSL Linux... ${percentage}% (${loadedMB}MB / ${totalMB}MB)`);

        if (percentage >= 100) {
            setTimeout(() => {
                this.hideDownloadProgress();
                this.updateStatus('Download complete! Starting virtual machine...');
            }, 1000);
        }
    }

    showPauseDialog() {
        this.pauseVM();
        document.getElementById('vmContainer').classList.add('paused');
    }

    hidePauseDialog() {
        document.getElementById('vmContainer').classList.remove('paused');
    }

    async startVM() {
        if (this.isVMStarted) return;
        
        this.hideDownloadProgress();
        
        if (this.selectedIsoSource === 'local' && !this.localIsoFile) {
            this.updateStatus('❌ Please select a local ISO file');
            return;
        }
        
        try {
            this.updateButton('<span class="loading"></span>Loading...', true);
            this.updateStatus('Initializing virtual machine...');

            if (typeof V86 === 'undefined') {
                this.updateStatus('❌ V86 library not loaded properly');
                this.updateButton('Start VM', false);
                return;
            }

            this.updateStatus('Checking resources...');
            const resourceChecks = await this.checkResources();
            if (!resourceChecks.success) {
                this.updateStatus('❌ ' + resourceChecks.error);
                this.updateButton('Start VM', false);
                return;
            }

            document.getElementById('mainContent').classList.add('hidden');
            document.getElementById('vmContainer').classList.add('active');

            try {
                await document.documentElement.requestFullscreen();
                this.isFullscreen = true;
            } catch (err) {
                console.log('Fullscreen request failed:', err.message);
            }

            if (this.selectedIsoSource === 'local') {
                this.updateStatus(`Starting virtual machine with ${this.localIsoFile.name}...`);
            } else {
                this.updateStatus('Starting virtual machine with hosted DSL Linux...');
            }

            console.log('Environment info:', {
                userAgent: navigator.userAgent,
                isSecureContext: window.isSecureContext,
                location: window.location.href,
                hasWebAssembly: typeof WebAssembly !== 'undefined',
                hasV86: typeof V86 !== 'undefined',
                isoSource: this.selectedIsoSource,
                localFile: this.selectedIsoSource === 'local' ? this.localIsoFile.name : null
            });

            let cdromConfig;
            if (this.selectedIsoSource === 'local') {
                const arrayBuffer = await this.localIsoFile.arrayBuffer();
                cdromConfig = {
                    buffer: arrayBuffer,
                };
            } else {
                cdromConfig = {
                    url: "dsl-2024.rc7.iso",
                };
            }

            this.emulator = new V86({
                wasm_path: "js/v86.wasm",
                memory_size: 512 * 1024 * 1024,
                vga_memory_size: 16 * 1024 * 1024,
                screen_container: document.getElementById("screen_container"),
                bios: {
                    url: "js/seabios.bin",
                },
                vga_bios: {
                    url: "js/vgabios.bin",
                },
                cdrom: cdromConfig,
                autostart: true,
                boot_order: 0x231,
                disable_mouse: false,
                mouse_grab: false,
                acpi: true,
                fastboot: true,
                network_relay_url: "wss://relay.widgetry.org/",
                network_adapter: "ne2k_pci",
                cpu_count: 1,
                hda: undefined,
                hdb: undefined,
                bzimage_initrd_from_filesystem: false,
            });

            const initTimeout = setTimeout(() => {
                if (!this.isVMStarted) {
                    console.error('VM initialization timeout');
                    this.updateStatus('❌ VM initialization timeout. Check browser console for details.');
                    this.updateButton('Start VM', false);
                    this.exitVM();
                }
            }, 30000); 

            this.emulator.add_listener("emulator-ready", () => {
                clearTimeout(initTimeout);
                this.isVMStarted = true;
                console.log('VM Ready - Starting DSL Linux boot process...');
                this.updateStatus('VM started! DSL Linux is booting...');
                
                setTimeout(() => {
                    if (this.emulator) {
                        this.emulator.mouse_set_status(true);
                    }
                }, 2000);
            });

            this.emulator.add_listener("emulator-started", () => {
                console.log('VM Started - DSL Linux is booting...');
                this.updateStatus('DSL Linux is booting... Please wait.');
            });

            this.emulator.add_listener("emulator-stopped", () => {
                console.log('VM Stopped');
            });

            this.emulator.add_listener("emulator-error", (error) => {
                console.error('VM Error:', error);
                this.updateStatus('❌ VM Error: ' + error);
                this.updateButton('Start VM', false);
                this.exitVM();
            });

            if (this.selectedIsoSource === 'hosted') {
                this.showDownloadProgress();
                
                this.emulator.add_listener("download-progress", (data) => {
                    if (data.file_name && data.file_name.includes('.iso')) {
                        this.updateDownloadProgress(data);
                    }
                });

                this.emulator.add_listener("download-error", (data) => {
                    console.error('Download error:', data);
                    this.hideDownloadProgress();
                    this.updateStatus('❌ Download failed. Please try again.');
                    this.updateButton('Start VM', false);
                    this.exitVM();
                });
            }

            this.emulator.add_listener("serial0-output-byte", (byte) => {
            });

        } catch (error) {
            console.error('Failed to initialize VM:', error);
            this.updateStatus('❌ Failed to initialize VM: ' + error.message);
            this.updateButton('Start VM', false);
            this.exitVM();
        }
    }

    async checkResources() {
        let resources = [
            { url: 'js/v86.wasm', name: 'WASM runtime' },
            { url: 'js/seabios.bin', name: 'BIOS' },
            { url: 'js/vgabios.bin', name: 'VGA BIOS' }
        ];

        if (this.selectedIsoSource === 'hosted' && this.hostedIsoAvailable) {
            resources.push({ url: 'dsl-2024.rc7.iso', name: 'DSL Linux ISO' });
        } else if (this.selectedIsoSource === 'local') {
            console.log('✓ Using local ISO file:', this.localIsoFile.name);
        } else {
            console.log('✓ Skipping hosted ISO check (not available)');
        }

        for (const resource of resources) {
            try {
                console.log(`Checking ${resource.name}...`);
                const response = await fetch(resource.url, { method: 'HEAD' });
                if (!response.ok) {
                    console.error(`Failed to load ${resource.name}:`, response.status, response.statusText);
                    
                    return { 
                        success: false, 
                        error: `Cannot load ${resource.name} (${response.status})` 
                    };
                }
                
                if (resource.url.includes('.iso')) {
                    const contentLength = response.headers.get('content-length');
                    if (contentLength) {
                        const sizeMB = Math.round(parseInt(contentLength) / (1024 * 1024));
                        console.log(`✓ ${resource.name} available (${sizeMB}MB)`);
                        if (sizeMB < 100) {
                            console.warn('ISO file seems smaller than expected. Original is 685MB.');
                        }
                    } else {
                        console.log(`✓ ${resource.name} available (size unknown)`);
                    }
                } else {
                    console.log(`✓ ${resource.name} available`);
                }
            } catch (error) {
                console.error(`Error checking ${resource.name}:`, error);
                
                return { 
                    success: false, 
                    error: `Cannot load ${resource.name}: ${error.message}` 
                };
            }
        }

        return { success: true };
    }

    pauseVM() {
        if (this.emulator && this.isVMStarted && !this.isPaused) {
            this.emulator.stop();
            this.isPaused = true;
            console.log('VM Paused');
        }
    }

    resumeVM() {
        if (this.emulator && this.isVMStarted && this.isPaused) {
            this.emulator.run();
            this.isPaused = false;
            console.log('VM Resumed');
        }
    }

    continueInBackground() {
        this.hidePauseDialog();
        this.resumeVM();
        
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        
        this.showWindowedMode();
    }

    showWindowedMode() {
        const vmContainer = document.getElementById('vmContainer');
        vmContainer.style.position = 'fixed';
        vmContainer.style.top = '50px';
        vmContainer.style.left = '50px';
        vmContainer.style.width = '80vw';
        vmContainer.style.height = '80vh';
        vmContainer.style.border = '2px solid #333';
        vmContainer.style.borderRadius = '8px';
        vmContainer.style.zIndex = '1000';
        
        this.addWindowControls();
    }

    addWindowControls() {
        const controls = document.querySelector('.vm-controls');
        if (controls) {
            controls.innerHTML = `
                <button class="exit-button" onclick="vm.closeWindow()">Close VM</button>
                <button class="exit-button" onclick="vm.makeFullscreen()" style="margin-right: 10px;">Fullscreen</button>
            `;
            controls.style.display = 'block';
        }
    }

    async makeFullscreen() {
        try {
            await document.documentElement.requestFullscreen();
            this.resetVMContainer();
        } catch (err) {
            console.log('Fullscreen request failed:', err.message);
        }
    }

    resetVMContainer() {
        const vmContainer = document.getElementById('vmContainer');
        vmContainer.style.position = 'fixed';
        vmContainer.style.top = '0';
        vmContainer.style.left = '0';
        vmContainer.style.width = '100vw';
        vmContainer.style.height = '100vh';
        vmContainer.style.border = 'none';
        vmContainer.style.borderRadius = '0';
        
        const controls = document.querySelector('.vm-controls');
        if (controls) {
            controls.innerHTML = '<button class="exit-button" onclick="vm.exitVM()">Exit Fullscreen (ESC)</button>';
        }
    }

    closeWindow() {
        this.exitVM();
    }

    exitVM() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        
        if (this.emulator) {
            this.emulator.stop();
        }
        
        this.hideDownloadProgress();
        
        this.resetVMContainer();
        this.hidePauseDialog();
        document.getElementById('vmContainer').classList.remove('active');
        document.getElementById('mainContent').classList.remove('hidden');
        this.updateButton('Start VM', false);
        
        this.updateStartButtonState();
        
        this.isVMStarted = false;
        this.isPaused = false;
        this.isFullscreen = false;
    }

    handleContinue() {
        this.hidePauseDialog();
        this.resumeVM();
        
        document.documentElement.requestFullscreen().then(() => {
            this.isFullscreen = true;
            this.resetVMContainer();
        }).catch(err => {
            console.log('Fullscreen request failed:', err.message);
        });
    }

    handleStop() {
        this.hidePauseDialog();
        this.exitVM();
    }

    initializeIsoSelection() {
        const toggleSwitch = document.getElementById('sourceToggle');
        const toggleOptions = document.querySelectorAll('.toggle-option');
        const hostedOption = document.querySelector('.toggle-option[data-value="hosted"]');
        const localOption = document.querySelector('.toggle-option[data-value="local"]');
        
        if (!this.hostedIsoAvailable) {
            this.selectedIsoSource = 'local';
            this.disableHostedOption();
            this.updateToggleState('local');
            this.toggleLocalFileSection();
        } else {
            this.updateToggleState('hosted');
        }
        
        toggleSwitch.addEventListener('click', () => {
            if (!this.hostedIsoAvailable) return; 
            
            const newSource = this.selectedIsoSource === 'hosted' ? 'local' : 'hosted';
            this.selectedIsoSource = newSource;
            this.updateToggleState(newSource);
            this.toggleLocalFileSection();
            this.updateStartButtonState();
        });
        
        toggleOptions.forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                
                if (value === 'hosted' && !this.hostedIsoAvailable) return;
                
                if (value !== this.selectedIsoSource) {
                    this.selectedIsoSource = value;
                    this.updateToggleState(value);
                    this.toggleLocalFileSection();
                    this.updateStartButtonState();
                }
            });
        });

        const fileInput = document.getElementById('isoFileInput');
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files[0]);
        });

        const removeFileBtn = document.getElementById('removeFile');
        removeFileBtn.addEventListener('click', () => {
            this.removeSelectedFile();
        });

        const uploadArea = document.getElementById('fileUploadArea');
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#007acc';
            uploadArea.style.background = '#f0f8ff';
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#ccc';
            uploadArea.style.background = '#fafafa';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#ccc';
            uploadArea.style.background = '#fafafa';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
            }
        });

        this.updateStartButtonState();
    }

    disableHostedOption() {
        const hostedOption = document.querySelector('.toggle-option[data-value="hosted"]');
        const toggleSwitch = document.getElementById('sourceToggle');
        
        if (hostedOption) {
            hostedOption.classList.add('disabled');
            hostedOption.style.opacity = '0.5';
            hostedOption.style.cursor = 'not-allowed';
            
            const description = hostedOption.querySelector('.toggle-description');
            if (description) {
                description.textContent = 'Not available (storage limitations)';
            }
        }
        
        if (toggleSwitch) {
            toggleSwitch.style.opacity = '0.5';
            toggleSwitch.style.cursor = 'not-allowed';
        }
    }

    updateToggleState(selectedValue) {
        const toggleSwitch = document.getElementById('sourceToggle');
        const toggleOptions = document.querySelectorAll('.toggle-option');
        
        if (selectedValue === 'local') {
            toggleSwitch.classList.add('active');
        } else {
            toggleSwitch.classList.remove('active');
        }
        
        toggleOptions.forEach(option => {
            if (option.dataset.value === selectedValue) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }

    toggleLocalFileSection() {
        const localSection = document.getElementById('localFileSection');
        if (this.selectedIsoSource === 'local') {
            localSection.style.display = 'block';
        } else {
            localSection.style.display = 'none';
            this.removeSelectedFile(); 
        }
    }

    handleFileSelection(file) {
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.iso')) {
            alert('Please select a valid ISO file.');
            return;
        }

        const maxSize = 1024 * 1024 * 1024; 
        if (file.size > maxSize) {
            alert('File is too large. Please select an ISO file smaller than 1GB.');
            return;
        }

        this.localIsoFile = file;
        
        if (this.localIsoUrl) {
            URL.revokeObjectURL(this.localIsoUrl);
        }
        this.localIsoUrl = URL.createObjectURL(file);

        this.displaySelectedFile(file);
        this.updateStartButtonState();
    }

    displaySelectedFile(file) {
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const fileInfo = document.getElementById('fileInfo');
        const uploadPlaceholder = document.querySelector('.upload-placeholder');

        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);
        
        uploadPlaceholder.style.display = 'none';
        fileInfo.style.display = 'flex';
    }

    removeSelectedFile() {
        this.localIsoFile = null;
        if (this.localIsoUrl) {
            URL.revokeObjectURL(this.localIsoUrl);
            this.localIsoUrl = null;
        }

        const fileInfo = document.getElementById('fileInfo');
        const uploadPlaceholder = document.querySelector('.upload-placeholder');
        const fileInput = document.getElementById('isoFileInput');

        fileInfo.style.display = 'none';
        uploadPlaceholder.style.display = 'flex';
        fileInput.value = '';

        this.updateStartButtonState();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateStartButtonState() {
        const startButton = document.getElementById('startButton');
        
        if (this.selectedIsoSource === 'hosted' && this.hostedIsoAvailable) {
            startButton.disabled = false;
            this.updateStatus('Ready to start with hosted DSL Linux version');
        } else if (this.selectedIsoSource === 'local' && this.localIsoFile) {
            startButton.disabled = false;
            this.updateStatus(`Ready to start with local ISO: ${this.localIsoFile.name}`);
        } else if (this.selectedIsoSource === 'local' && !this.localIsoFile) {
            startButton.disabled = true;
            if (!this.hostedIsoAvailable) {
                this.updateStatus('Hosted DSL Linux not available - please select a local ISO file to continue');
            } else {
                this.updateStatus('Please select a local ISO file to continue');
            }
        } else if (this.selectedIsoSource === 'hosted' && !this.hostedIsoAvailable) {
            startButton.disabled = true;
            this.updateStatus('Hosted DSL Linux not available - switching to local mode required');
        } else {
            startButton.disabled = true;
            this.updateStatus('Please select an ISO source to continue');
        }
    }

    async initializeApp() {
        this.updateStatus('Checking hosted DSL Linux availability...');
        await this.checkHostedIsoAvailability();
        
        this.initializeIsoSelection();
        
        if (this.hostedIsoAvailable) {
            this.updateStatus('Choose your DSL Linux source and click Start VM to launch in fullscreen mode');
        } else {
            this.updateStatus('Hosted DSL Linux not available - please select a local ISO file to continue');
        }
    }

    async checkHostedIsoAvailability() {
        try {
            console.log('Checking hosted DSL Linux ISO availability...');
            const response = await fetch('dsl-2024.rc7.iso', { method: 'HEAD' });
            
            if (response.ok) {
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                    const sizeMB = Math.round(parseInt(contentLength) / (1024 * 1024));
                    console.log(`✓ Hosted DSL Linux ISO available (${sizeMB}MB)`);
                    if (sizeMB < 100) {
                        console.warn('Hosted ISO seems smaller than expected. Original is ~685MB.');
                    }
                } else {
                    console.log('✓ Hosted DSL Linux ISO available (size unknown)');
                }
                this.hostedIsoAvailable = true;
            } else {
                console.warn(`Hosted DSL Linux ISO not available (${response.status})`);
                this.hostedIsoAvailable = false;
            }
        } catch (error) {
            console.warn('Hosted DSL Linux ISO cannot be loaded:', error.message);
            this.hostedIsoAvailable = false;
        }
    }
}

const vm = new DSLLinuxVM();

function startVM() {
    vm.startVM();
}

function exitVM() {
    vm.exitVM();
}

function handleContinue() {
    vm.handleContinue();
}

function handleStop() {
    vm.handleStop();
} 