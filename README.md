# 🖥️ Mini Client-Side VM

A lightweight, web-based virtual desktop environment powered by **v86 WebAssembly** and **Damn Small Linux (DSL)**. Experience a full Linux desktop directly in your browser without any server-side processing.

## ✨ Features

- 🌐 **Runs entirely in the browser** - No server required for execution
- ⚡ **WebAssembly powered** - Fast and efficient virtualization using v86
- 🐧 **Damn Small Linux** - Lightweight Linux distribution perfect for web deployment
- 📁 **Dual file support** - Load ISO from hosted server or local client machine
- 🎯 **Proof of concept** - Demonstrates client-side virtualization capabilities

## 🎯 What is this?

This project showcases how modern web technologies can create a fully functional Linux desktop environment that runs entirely in your browser. Using v86's WebAssembly implementation, it virtualizes a complete operating system without requiring any backend infrastructure.

## 🚀 Quick Start

### Option 1: Using Hosted ISO (Recommended for deployment)

For production deployments on hosting providers like Netlify or Render, download the DSL ISO to your server:

```bash
wget https://www.damnsmalllinux.org/download/dsl-2024.rc7.iso
```

### Option 2: Local Files Only

If you skip downloading the ISO to your server, the application will only accept local ISO files uploaded by users.

## 📋 Requirements

- Modern web browser with WebAssembly support
- Sufficient RAM (recommended: 2GB+ available)
- Stable internet connection (for initial load)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MiniVM
   ```

2. **Download the DSL ISO** (optional, for hosted deployment)
   ```bash
   wget https://www.damnsmalllinux.org/download/dsl-2024.rc7.iso
   ```

3. **Serve the files**
   - For development: Use any local web server
   - For production: Deploy to your preferred hosting platform

## 💡 Usage

1. Open the application in your web browser
2. Wait for the v86 WebAssembly module to initialize
3. The virtual machine will boot Damn Small Linux automatically
4. Interact with the Linux desktop environment directly in your browser

## 🌍 Deployment

This project can be deployed on any static hosting provider:

- **Netlify** - Drop the files or connect your Git repository
- **Vercel** - Deploy directly from GitHub
- **GitHub Pages** - Enable Pages in your repository settings
- **Traditional web hosting** - Upload files to any web server

## ⚠️ Important Notes

- **ISO Hosting**: If you don't include the DSL ISO file with your deployment, users will need to provide their own ISO files
- **Performance**: Initial load may take time as WebAssembly modules are downloaded and initialized
- **Browser Compatibility**: Requires a modern browser with WebAssembly support

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## 📄 License

This project is a proof-of-concept demonstration. Please check individual component licenses:
- v86 WebAssembly emulator
- Damn Small Linux distribution

---

**Note**: This is an experimental project showcasing client-side virtualization. Performance and compatibility may vary across different browsers and devices.
