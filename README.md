# ⚡️ Renamer (Next-Gen File Renaming)

> **The ultimate desktop tool for renaming files with the power of Local AI.**  
> *Minimalist. Fast. Private.*

![Clean UI](https://img.shields.io/badge/Style-Minimalist-blue) ![Electron](https://img.shields.io/badge/Built%20With-Electron-green) ![AI](https://img.shields.io/badge/AI-Ollama-orange)

---

## 🚀 Why is this "Rad"?

This isn't your grandpa's file renamer. **Renamer** integrates with **Ollama** running locally on your machine to "see" your images and give them meaningful names automatically.

### ✨ Key Features

-   **🧠 AI Smart Rename**: Drag in a photo of a dog on a beach, and it renames to `dog_on_beach.jpg` automatically. No cloud, no subscription, 100% private.
-   **🎨 Beautiful UI**: Crafted with a "White & Blue" macOS-inspired aesthetic. Clean, crisp, and distraction-free.
-   **⚡️ Blazing Fast**: Built on **Next.js** and **Electron** for native performance.
-   **🛠 Power Tools**:
    -   **Add Prefix/Suffix**: Quickly tag batches of files.
    -   **Smart Numbering**: Organize files sequentially.
    -   **Real-time Preview**: See exactly what your files will look like before you click "Rename".

---

## 🛠 Tech Stack

-   **Runtime**: Electron (Nextron)
-   **Frontend**: Next.js (App Router), React, TypeScript
-   **Styling**: Tailwind CSS
-   **AI Engine**: Ollama (Model: `moondream`)

---

## 🏁 Getting Started

### Prerequisites

1.  **Node.js**: Install Node.js (v18+ recommended).
2.  **Ollama**: Install [Ollama](https://ollama.ai/).
3.  **Pull the Model**:
    ```bash
    ollama pull moondream
    ```

### Installation

1.  **Clone the repo**:
    ```bash
    git clone https://github.com/yourusername/renamer.git
    cd renamer
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run it!**:
    ```bash
    # Start Ollama first in a separate terminal
    ollama serve
    
    # Start the app
    npm run dev
    ```

---

## 🎮 How to Use

1.  **Open the App**: You'll be greeted by the dashingly clean interface.
2.  **Add Files**: Click the big "Add Files" button or drag-and-drop.
3.  **Choose Your Weapon**:
    -   Select **"Smart Rename"** for AI magic.
    -   Select **"Add Prefix"** or **"Add Suffix"** for classic batching.
4.  **Execute**: Click **"Rename Files"** and watch the magic happen.

---

## 📸 Screenshots

*(Add some cool screenshots here)*

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

*Made with ❤️ and TypeScript.*
