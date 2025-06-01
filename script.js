class DSLLinuxVM {
    constructor() {
        this.emulator = null;
        this.isVMStarted = false;
        this.isPaused = false;
        this.isFullscreen = false;
        
        this.initializeParticles();
        this.bindEvents();
        this.updateStatus('Click Start VM to launch DSL Linux in fullscreen mode');
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

    showPauseDialog() {
        this.pauseVM();
        document.getElementById('vmContainer').classList.add('paused');
    }

    hidePauseDialog() {
        document.getElementById('vmContainer').classList.remove('paused');
    }

    async startVM() {
        if (this.isVMStarted) return;
        
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

            this.updateStatus('Starting virtual machine...');

            // Log environment information for debugging
            console.log('Environment info:', {
                userAgent: navigator.userAgent,
                isSecureContext: window.isSecureContext,
                location: window.location.href,
                hasWebAssembly: typeof WebAssembly !== 'undefined',
                hasV86: typeof V86 !== 'undefined'
            });

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
                cdrom: {
                    url: "dsl-2024.rc7.iso",
                },
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

            // Add timeout for VM initialization
            const initTimeout = setTimeout(() => {
                if (!this.isVMStarted) {
                    console.error('VM initialization timeout');
                    this.updateStatus('❌ VM initialization timeout. Check browser console for details.');
                    this.updateButton('Start VM', false);
                    this.exitVM();
                }
            }, 30000); // 30 second timeout

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
        const resources = [
            { url: 'js/v86.wasm', name: 'WASM runtime' },
            { url: 'js/seabios.bin', name: 'BIOS' },
            { url: 'js/vgabios.bin', name: 'VGA BIOS' },
            { url: 'dsl-2024.rc7.iso', name: 'DSL Linux ISO' }
        ];

        for (const resource of resources) {
            try {
                console.log(`Checking ${resource.name}...`);
                const response = await fetch(resource.url, { method: 'HEAD' });
                if (!response.ok) {
                    console.error(`Failed to load ${resource.name}:`, response.status, response.statusText);
                    
                    // Special handling for ISO file
                    if (resource.url.includes('.iso')) {
                        return { 
                            success: false, 
                            error: `DSL Linux ISO not available (${response.status}). File may be too large for deployment platform. Try hosting the 685MB ISO file on a CDN.` 
                        };
                    }
                    
                    return { 
                        success: false, 
                        error: `Cannot load ${resource.name} (${response.status})` 
                    };
                }
                
                // Check file size for ISO
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
                
                // Special handling for ISO file
                if (resource.url.includes('.iso')) {
                    return { 
                        success: false, 
                        error: `DSL Linux ISO cannot be loaded: ${error.message}. This is likely because the 685MB file exceeds the deployment platform's size limits.` 
                    };
                }
                
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
        
        this.resetVMContainer();
        this.hidePauseDialog();
        document.getElementById('vmContainer').classList.remove('active');
        document.getElementById('mainContent').classList.remove('hidden');
        this.updateButton('Start VM', false);
        this.updateStatus('Click Start VM to launch DSL Linux in fullscreen mode');
        
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
}

let vm;
document.addEventListener('DOMContentLoaded', function() {
    vm = new DSLLinuxVM();
});

function startVM() {
    if (vm) vm.startVM();
}

function exitVM() {
    if (vm) vm.exitVM();
}

function handleContinue() {
    if (vm) vm.handleContinue();
}

function handleStop() {
    if (vm) vm.handleStop();
} 