import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import QRCode from "react-qr-code"
import { toast } from "sonner"
import { Github } from "lucide-react"

type QrSize = "small" | "medium" | "large"

const sizeToPixels: Record<QrSize, number> = {
  small: 160,
  medium: 220,
  large: 280,
}

export function App() {
  const [value, setValue] = useState("https://qr-studio-blond.vercel.app")
  const [notes, setNotes] = useState("")
  const [mode, setMode] = useState<"url" | "wifi">("url")
  const [wifiSsid, setWifiSsid] = useState("")
  const [wifiPassword, setWifiPassword] = useState("")
  const [wifiSecurity, setWifiSecurity] = useState<"WPA" | "WEP" | "nopass">(
    "WPA",
  )
  const [wifiHidden, setWifiHidden] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [language, setLanguage] = useState<"es" | "en">(() => {
    if (typeof window === "undefined") return "es"
    const stored = localStorage.getItem("qr-studio-lang")
    return stored === "en" ? "en" : "es"
  })

  function setLanguageAndPersist(lang: "es" | "en") {
    setLanguage(lang)
    localStorage.setItem("qr-studio-lang", lang)
  }
  const [feedbackName, setFeedbackName] = useState("")
  const [feedbackEmail, setFeedbackEmail] = useState("")
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [size, setSize] = useState<QrSize>("medium")
  const [foreground, setForeground] = useState("#020617") // slate-950
  const [background, setBackground] = useState("#f8fafc") // slate-50

  const qrSize = sizeToPixels[size]
  const qrPayload =
    mode === "wifi"
      ? `WIFI:T:${wifiSecurity};S:${wifiSsid};${
          wifiSecurity !== "nopass" && wifiPassword ? `P:${wifiPassword};` : ""
        }${wifiHidden ? "H:true;" : ""};`
      : value
  const isQrEmpty =
    mode === "wifi"
      ? !wifiSsid.trim() || (wifiSecurity !== "nopass" && !wifiPassword.trim())
      : value.trim().length === 0
  const qrRef = useRef<HTMLDivElement | null>(null)

  async function handleSubmitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!feedbackMessage.trim()) {
      toast.error(
        language === "es"
          ? "Por favor escribe un mensaje de feedback."
          : "Please write a feedback message."
      )
      return
    }

    try {
      const response = await fetch("https://formspree.io/f/xeerppjj", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: feedbackName,
          email: feedbackEmail,
          message: feedbackMessage,
        }),
      })

      if (!response.ok) {
        throw new Error("Request failed")
      }

      setFeedbackName("")
      setFeedbackEmail("")
      setFeedbackMessage("")
      setIsFeedbackOpen(false)
      toast.success(
        language === "es"
          ? "Gracias por tu feedback."
          : "Thanks for your feedback."
      )
    } catch (error) {
      console.error(error)
      toast.error(
        language === "es"
          ? "No se pudo enviar el feedback. Inténtalo de nuevo."
          : "Feedback could not be sent. Please try again."
      )
    }
  }

  function handleDownloadSvg() {
    const container = qrRef.current
    const svg = container?.querySelector("svg") as SVGSVGElement | null
    if (!svg) return

    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svg)
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = "qr-studio-code.svg"
    link.click()

    URL.revokeObjectURL(url)
    toast.success(
      language === "es"
        ? "SVG descargado correctamente."
        : "SVG downloaded successfully."
    )
  }

  function handleDownloadPng() {
    const container = qrRef.current
    const svg = container?.querySelector("svg") as SVGSVGElement | null
    if (!svg) return

    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svg)
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svgBlob)

    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = qrSize * 2
      canvas.height = qrSize * 2

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.fillStyle = background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

      const pngUrl = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.href = pngUrl
      link.download = "qr-studio-code.png"
      link.click()

      URL.revokeObjectURL(url)
      toast.success(
        language === "es"
          ? "PNG descargado correctamente."
          : "PNG downloaded successfully."
      )
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      toast.error(
        language === "es"
          ? "No se pudo generar el PNG."
          : "PNG could not be generated."
      )
    }

    image.src = url
  }

  async function handleCopyContent() {
    if (isQrEmpty) return
    try {
      await navigator.clipboard.writeText(qrPayload)
      toast.success(
        language === "es"
          ? "Contenido copiado al portapapeles."
          : "Content copied to clipboard.",
      )
    } catch {
      toast.error(
        language === "es"
          ? "No se pudo copiar."
          : "Could not copy.",
      )
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b border-border/60 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg border border-border/60 bg-muted/60 text-[0.7rem] font-semibold tracking-tight">
              QR
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight tracking-tight sm:text-lg">
                QR Studio
              </h1>
              <p className="hidden text-[0.7rem] text-muted-foreground sm:block">
                {language === "es"
                  ? "Genera códigos QR limpios para tus proyectos."
                  : "Generate clean QR codes for your projects."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <Select
                value={language}
                onValueChange={(value) => setLanguageAndPersist(value as "es" | "en")}
              >
                <SelectTrigger className="h-8 w-[120px] rounded-full border-border/60 bg-muted/60 px-3 text-xs">
                  <SelectValue
                    placeholder={language === "es" ? "Idioma" : "Language"}
                  />
                </SelectTrigger>
                <SelectContent align="end" className="min-w-[140px]">
                  <SelectItem value="es">
                    <span className="mr-1">🇩🇴</span>
                    <span>Español</span>
                  </SelectItem>
                  <SelectItem value="en">
                    <span className="mr-1">🇺🇸</span>
                    <span>English</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="hidden text-[0.7rem] text-muted-foreground sm:inline">
              {language === "es" ? "Pulsa" : "Press"}{" "}
              <kbd className="rounded bg-muted px-1 text-[0.65rem]">d</kbd>{" "}
              {language === "es" ? "para alternar tema." : "to toggle theme."}
            </p>
            <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full px-4 text-[0.75rem]"
                >
                  Feedback
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {language === "es" ? "Enviar feedback" : "Send feedback"}
                  </DialogTitle>
                  <DialogDescription>
                    {language === "es"
                      ? "Cuéntame qué te parece QR Studio o qué te gustaría mejorar."
                      : "Tell me what you think about QR Studio or what you’d improve."}
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmitFeedback}>
                  <div className="space-y-2">
                    <Label htmlFor="feedback-name">
                      {language === "es" ? "Nombre completo" : "Full name"}
                    </Label>
                    <Input
                      id="feedback-name"
                      placeholder={
                        language === "es"
                          ? "Tu nombre (opcional)"
                          : "Your name (optional)"
                      }
                      value={feedbackName}
                      onChange={(event) => setFeedbackName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedback-email">
                      {language === "es" ? "Correo electrónico" : "Email"}
                    </Label>
                    <Input
                      id="feedback-email"
                      type="email"
                      placeholder={
                        language === "es"
                          ? "tu-correo@ejemplo.com"
                          : "you@example.com"
                      }
                      value={feedbackEmail}
                      onChange={(event) => setFeedbackEmail(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedback-message">
                      {language === "es" ? "Mensaje" : "Message"}
                    </Label>
                    <Textarea
                      id="feedback-message"
                      placeholder={
                        language === "es"
                          ? "Escribe aquí tu feedback..."
                          : "Write your feedback here..."
                      }
                      rows={4}
                      value={feedbackMessage}
                      onChange={(event) =>
                        setFeedbackMessage(event.target.value)
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      className="px-4 text-[0.8rem]"
                    >
                      {language === "es" ? "Enviar" : "Send"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <a
              href="http://github.com/Diegomarte9"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Abrir GitHub de Diego Marte"
            >
              <Github className="h-4.5 w-4.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 md:items-center">
        <div className="w-full max-w-5xl">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">
                {language === "es" ? "Contenido del QR" : "QR content"}
              </CardTitle>
              <CardDescription>
                {language === "es"
                  ? "Define el destino y algunos detalles visuales básicos."
                  : "Define the target and a few visual details."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="qr-value">
                    {language === "es" ? "Tipo de contenido" : "Content type"}
                  </Label>
                  <div className="flex gap-2 text-[0.8rem]">
                    <button
                      type="button"
                      onClick={() => setMode("url")}
                      className={`rounded-full px-3 py-1 transition-colors ${
                        mode === "url"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {language === "es" ? "Texto / URL" : "Text / URL"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("wifi")}
                      className={`rounded-full px-3 py-1 transition-colors ${
                        mode === "wifi"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Wi‑Fi
                    </button>
                  </div>
                </div>

                {mode === "url" ? (
                  <div className="space-y-2">
                    <Label htmlFor="qr-value">
                      {language === "es" ? "Texto o URL" : "Text or URL"}
                    </Label>
                    <Textarea
                      id="qr-value"
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                      placeholder="https://qr-studio-blond.vercel.app"
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wifi-ssid">
                        {language === "es" ? "Nombre de red (SSID)" : "SSID"}
                      </Label>
                      <Input
                        id="wifi-ssid"
                        value={wifiSsid}
                        onChange={(event) => setWifiSsid(event.target.value)}
                        placeholder={
                          language === "es" ? "MiWifiCasa" : "MyHomeWifi"
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wifi-security">
                        {language === "es" ? "Seguridad" : "Security"}
                      </Label>
                      <Select
                        value={wifiSecurity}
                        onValueChange={(next) =>
                          setWifiSecurity(next as "WPA" | "WEP" | "nopass")
                        }
                      >
                        <SelectTrigger id="wifi-security" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WPA">WPA/WPA2</SelectItem>
                          <SelectItem value="WEP">WEP</SelectItem>
                          <SelectItem value="nopass">
                            {language === "es"
                              ? "Sin contraseña"
                              : "No password"}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {wifiSecurity !== "nopass" && (
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="wifi-password">
                          {language === "es" ? "Contraseña" : "Password"}
                        </Label>
                        <Input
                          id="wifi-password"
                          type="password"
                          value={wifiPassword}
                          onChange={(event) =>
                            setWifiPassword(event.target.value)
                          }
                          placeholder="••••••••"
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={wifiHidden}
                        onChange={(event) =>
                          setWifiHidden(event.target.checked)
                        }
                        className="h-3 w-3 rounded border border-border accent-primary"
                      />
                      <span>
                        {language === "es"
                          ? "La red está oculta"
                          : "Network is hidden"}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="qr-size">
                    {language === "es" ? "Tamaño" : "Size"}
                  </Label>
                  <Select
                    value={size}
                    onValueChange={(next) => setSize(next as QrSize)}
                  >
                    <SelectTrigger id="qr-size" className="w-full">
                      <SelectValue
                        placeholder={
                          language === "es"
                            ? "Selecciona un tamaño"
                            : "Select a size"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">
                        {language === "es" ? "Pequeño" : "Small"}
                      </SelectItem>
                      <SelectItem value="medium">
                        {language === "es" ? "Mediano" : "Medium"}
                      </SelectItem>
                      <SelectItem value="large">
                        {language === "es" ? "Grande" : "Large"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qr-foreground">
                    {language === "es"
                      ? "Color principal"
                      : "Primary color"}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="qr-foreground"
                      type="text"
                      value={foreground}
                      onChange={(event) => setForeground(event.target.value)}
                      placeholder="#020617"
                    />
                    <Input
                      aria-label="Selector de color"
                      type="color"
                      value={foreground}
                      onChange={(event) => setForeground(event.target.value)}
                      className="h-9 w-10 cursor-pointer p-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qr-background">
                  {language === "es" ? "Fondo" : "Background"}
                </Label>
                <div className="flex w-full items-center gap-2">
                  <Input
                    id="qr-background"
                    type="text"
                    value={background}
                    onChange={(event) => setBackground(event.target.value)}
                    placeholder="#f8fafc"
                    className="flex-1"
                  />
                  <Input
                    aria-label="Selector de color de fondo"
                    type="color"
                    value={background}
                    onChange={(event) => setBackground(event.target.value)}
                    className="h-9 w-10 cursor-pointer p-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qr-notes">
                  {language === "es"
                    ? "Notas internas (opcional)"
                    : "Internal notes (optional)"}
                </Label>
                <Input
                  id="qr-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={
                    language === "es"
                      ? "Landing verano, campaña newsletter, etc."
                      : "Summer landing, newsletter campaign, etc."
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">
                {language === "es" ? "Vista previa" : "Preview"}
              </CardTitle>
              <CardDescription>
                {language === "es"
                  ? "Previsualiza el resultado antes de descargar o compartir."
                  : "Preview the result before downloading or sharing."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-full flex-col justify-between gap-4">
              <div className="flex flex-1 items-center justify-center">
                <div className="inline-flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/40 px-6 py-5">
                  {isQrEmpty ? (
                    <p className="max-w-xs text-center text-xs text-muted-foreground">
                      {language === "es"
                        ? "Escribe un texto o URL para generar tu código QR."
                        : "Type some text or a URL to generate your QR code."}
                    </p>
                  ) : (
                    <>
                      <div
                        ref={qrRef}
                        className="rounded-lg bg-background p-3 shadow-sm"
                        style={{ backgroundColor: background }}
                      >
                        <QRCode
                          value={qrPayload}
                          size={qrSize}
                          fgColor={foreground}
                          bgColor={background}
                        />
                      </div>
                      <p className="max-w-xs text-center text-[0.7rem] text-muted-foreground">
                        {language === "es"
                          ? "Este es un preview en vivo. Podrás añadir descarga e historial en el siguiente paso."
                          : "This is a live preview. You can add download and history features in the next step."}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3 border-t border-border/60 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[0.7rem] text-muted-foreground">
                  <span>
                    {language === "es" ? "Tamaño:" : "Size:"}{" "}
                    <span className="font-medium">{qrSize}px</span>
                  </span>
                  <span className="flex gap-2">
                    <span>
                      {language === "es" ? "Color:" : "Color:"}{" "}
                      <span className="font-mono">{foreground}</span>
                    </span>
                    <span>
                      {language === "es" ? "Fondo:" : "Background:"}{" "}
                      <span className="font-mono">{background}</span>
                    </span>
                  </span>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    type="button"
                    disabled={isQrEmpty}
                    onClick={handleCopyContent}
                  >
                    {language === "es" ? "Copiar" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={isQrEmpty}
                    onClick={handleDownloadSvg}
                  >
                    {language === "es" ? "Descargar SVG" : "Download SVG"}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    type="button"
                    disabled={isQrEmpty}
                    onClick={handleDownloadPng}
                  >
                    {language === "es" ? "Descargar PNG" : "Download PNG"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 px-4 py-6 text-xs text-muted-foreground sm:px-6 sm:py-7">
        <div className="mx-auto flex max-w-5xl justify-center">
          <p className="flex flex-wrap items-center gap-1 text-[0.8rem] sm:text-sm">
            {language === "es" ? "Hecho en 🇩🇴 por " : "Made in 🇩🇴 by "}
            <a
              href="http://github.com/Diegomarte9"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Diego Marte
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
