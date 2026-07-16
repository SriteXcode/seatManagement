# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## 💬 Live Chat Integration (Tawk.to)

We have integrated a dynamic **Tawk.to** live chat support widget into this application. It allows administrators, invigilators, and students to request real-time help.

### 🔑 Configuration Options

The widget can be configured in two ways:
1. **Developer / Environment Configuration**:
   Add the following variables to your `.env` (or `.env.production`) file in the frontend folder:
   ```env
   VITE_TAWK_PROPERTY_ID=your_tawk_property_id
   VITE_TAWK_WIDGET_ID=your_tawk_widget_id
   ```
2. **Administrator Web Configuration**:
   Admin users can configure the chat widget directly from the application UI by navigating to the **Profile Tab**. Values saved here are persisted in `localStorage` as an override.

### 👤 Identity Binding
When a logged-in user interacts with the chat widget, their username/name and email are automatically passed to Tawk.to. This ensures that support staff can immediately identify the user.
