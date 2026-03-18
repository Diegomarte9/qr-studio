# QR Studio

## Español

Genera códigos QR para **URL/texto**, **Wi‑Fi**, **llamadas** (`tel:`), **email**, **SMS**, **WhatsApp** y **contacto (vCard)**.

**Demo:** [qr-studio-blond.vercel.app](https://qr-studio-blond.vercel.app)

### Características

| Área | Detalle |
|------|---------|
| **Acciones** | **Compartir** (nativo: PNG o texto/URL), **Copiar** payload del QR, **SVG** y **PNG**. Una acción a la vez para evitar dobles descargas o compartidos accidentales. |
| **Historial** | Hasta **20** entradas en `localStorage` (`qr-studio-history`). Se guarda al descargar/compartir imagen. Clic en fila restaura el formulario. **URLs** se muestran como dominio (ej. `ejemplo.com`); botón **copiar** guarda el enlace/texto completo sin mostrarlo. |
| **QR** | Tamaño S/M/L, corrección **L/M/Q/H**, presets **Oscuro / Claro / Corporativo**. |
| **Validación** | Teléfonos (llamada, SMS, WA) con código de país **`+`**; email con **`@`** en destinatario antes de copiar/descargar/compartir. |
| **UX** | Idioma **ES/EN** (`qr-studio-lang`), tema claro/oscuro (**tecla `d`**). **Ctrl/Cmd+Enter** → descarga PNG. Feedback vía Formspree con estado *enviando* para no duplicar envíos. |

### Stack

- **React 19** + **TypeScript**
- **Vite**
- **Tailwind CSS** + **shadcn/ui**
- **react-qr-code** para el QR
- **Sonner** para toasts
- **Formspree** para el formulario de feedback

### Cómo ejecutarlo

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev

# Build para producción
pnpm build

# Vista previa del build
pnpm preview
```

### Scripts

| Comando     | Descripción          |
|------------|----------------------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción  |
| `pnpm preview` | Sirve el build local |
| `pnpm lint` | Ejecuta ESLint       |
| `pnpm typecheck` | Verificación de tipos |
| `pnpm format` | Formatea con Prettier |

### Añadir componentes (shadcn)

```bash
pnpm dlx shadcn@latest add <componente>
```

---

## English

Generate QR codes for **URL/text**, **Wi‑Fi**, **calls** (`tel:`), **email**, **SMS**, **WhatsApp**, and **contact (vCard)**.

**Demo:** [qr-studio-blond.vercel.app](https://qr-studio-blond.vercel.app)

### Features

| Area | Detail |
|------|--------|
| **Actions** | **Share** (native: PNG or text/URL), **Copy** QR payload, **SVG** and **PNG** download. One QR action at a time to avoid double downloads or accidental double share. |
| **History** | Up to **20** entries in `localStorage` (`qr-studio-history`). Saved on image download/share. Row click restores the form. **URLs** show as domain (e.g. `example.com`); **copy** button puts the full link/text on the clipboard without displaying it. |
| **QR** | Size S/M/L, **L/M/Q/H** error correction, **Dark / Light / Corporate** color presets. |
| **Validation** | Phone fields (call, SMS, WA) require country code **`+`**; email needs **`@`** in the *to* field before copy/download/share. |
| **UX** | **ES/EN** language (`qr-studio-lang`), light/dark theme (**`d`** key). **Ctrl/Cmd+Enter** → PNG download. Formspree feedback with *sending* state to prevent duplicate submissions. |

### Stack

- **React 19** + **TypeScript**
- **Vite**
- **Tailwind CSS** + **shadcn/ui**
- **react-qr-code** for the QR
- **Sonner** for toasts
- **Formspree** for the feedback form

### How to run

```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Production build
pnpm build

# Preview the build
pnpm preview
```

### Scripts

| Command     | Description          |
|------------|----------------------|
| `pnpm dev` | Development server   |
| `pnpm build` | Production build   |
| `pnpm preview` | Serve build locally |
| `pnpm lint` | Run ESLint          |
| `pnpm typecheck` | Type checking    |
| `pnpm format` | Format with Prettier |

### Add components (shadcn)

```bash
pnpm dlx shadcn@latest add <component>
```

---

Hecho en 🇩🇴 por [Diego Marte](https://github.com/Diegomarte9) · Made in 🇩🇴 by [Diego Marte](https://github.com/Diegomarte9).
