# Contributing to Exam Seating Allotment Portal

First off, thank you for taking the time to contribute! Contributions make the open-source community an amazing place to learn, inspire, and create.

All types of contributions are encouraged and valued. See below for details on how to get started.

---

## 🧭 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 🛠️ How to Contribute

### 1. Reporting Bugs
* Search the existing Issues before opening a new one.
* Use a clear and descriptive title.
* Provide a clean summary of steps to reproduce the bug, expected vs actual behavior, and include logs or screenshots if possible.

### 2. Feature Requests
* Explain the use case and why this feature is useful to the broader community.
* Outline mock interfaces or configuration behaviors if applicable.

### 3. Pull Requests (PRs)
1. Fork the repository.
2. Create a new branch detailing your feature or fix (e.g. `feat/algorithm-update` or `fix/pwa-icons`).
3. Commit your changes with clean, descriptive message guidelines.
4. Ensure the client build compiles successfully:
   ```bash
   cd client
   npm run build
   ```
5. Submit the Pull Request pointing to the `main` branch.

---

## 💻 Development Standards

* **Linting & Formatting**: Follow ES6+ principles. Keep component definitions clean, modular, and use ES imports.
* **Performance Checks**: When adding dependencies or modules, ensure heavy libraries are dynamic imported to protect the bundle footprint.
