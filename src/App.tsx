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
  const [value, setValue] = useState("https://qr.studio")
  const [notes, setNotes] = useState("")
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [feedbackName, setFeedbackName] = useState("")
  const [feedbackEmail, setFeedbackEmail] = useState("")
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [size, setSize] = useState<QrSize>("medium")
  const [foreground, setForeground] = useState("#020617") // slate-950
  const [background, setBackground] = useState("#f8fafc") // slate-50

  const isValueEmpty = value.trim().length === 0

  const qrSize = sizeToPixels[size]
  const qrRef = useRef<HTMLDivElement | null>(null)

  async function handleSubmitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!feedbackMessage.trim()) {
      toast.error("Por favor escribe un mensaje de feedback.")
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
      toast.success("Gracias por tu feedback.")
    } catch (error) {
      console.error(error)
      toast.error("No se pudo enviar el feedback. Inténtalo de nuevo.")
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
    toast.success("SVG descargado correctamente.")
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
      toast.success("PNG descargado correctamente.")
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      toast.error("No se pudo generar el PNG.")
    }

    image.src = url
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
                Genera códigos QR limpios para tus proyectos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-[0.7rem] text-muted-foreground sm:inline">
              Pulsa{" "}
              <kbd className="rounded bg-muted px-1 text-[0.65rem]">d</kbd>{" "}
              para alternar tema.
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
                  <DialogTitle>Enviar feedback</DialogTitle>
                  <DialogDescription>
                    Cuéntame qué te parece QR Studio o qué te gustaría mejorar.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmitFeedback}>
                  <div className="space-y-2">
                    <Label htmlFor="feedback-name">Nombre completo</Label>
                    <Input
                      id="feedback-name"
                      placeholder="Tu nombre (opcional)"
                      value={feedbackName}
                      onChange={(event) => setFeedbackName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedback-email">Correo electrónico</Label>
                    <Input
                      id="feedback-email"
                      type="email"
                      placeholder="tu-correo@ejemplo.com"
                      value={feedbackEmail}
                      onChange={(event) => setFeedbackEmail(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedback-message">Mensaje</Label>
                    <Textarea
                      id="feedback-message"
                      placeholder="Escribe aquí tu feedback..."
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
                      Enviar
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
              <CardTitle className="text-base">Contenido del QR</CardTitle>
              <CardDescription>
                Define el destino y algunos detalles visuales básicos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="qr-value">Texto o URL</Label>
                <Textarea
                  id="qr-value"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="https://tu-link.com/campana"
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="qr-size">Tamaño</Label>
                  <Select
                    value={size}
                    onValueChange={(next) => setSize(next as QrSize)}
                  >
                    <SelectTrigger id="qr-size" className="w-full">
                      <SelectValue placeholder="Selecciona un tamaño" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Pequeño</SelectItem>
                      <SelectItem value="medium">Mediano</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qr-foreground">Color principal</Label>
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
                <Label htmlFor="qr-background">Fondo</Label>
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
                <Label htmlFor="qr-notes">Notas internas (opcional)</Label>
                <Input
                  id="qr-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Landing verano, campaña newsletter, etc."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Vista previa</CardTitle>
              <CardDescription>
                Previsualiza el resultado antes de descargar o compartir.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-full flex-col justify-between gap-4">
              <div className="flex flex-1 items-center justify-center">
                <div className="inline-flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/40 px-6 py-5">
                  {isValueEmpty ? (
                    <p className="max-w-xs text-center text-xs text-muted-foreground">
                      Escribe un texto o URL para generar tu código QR.
                    </p>
                  ) : (
                    <>
                      <div
                        ref={qrRef}
                        className="rounded-lg bg-background p-3 shadow-sm"
                        style={{ backgroundColor: background }}
                      >
                        <QRCode
                          value={value}
                          size={qrSize}
                          fgColor={foreground}
                          bgColor={background}
                        />
                      </div>
                      <p className="max-w-xs text-center text-[0.7rem] text-muted-foreground">
                        Este es un preview en vivo. Podrás añadir descarga e
                        historial en el siguiente paso.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3 border-t border-border/60 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[0.7rem] text-muted-foreground">
                  <span>
                    Tamaño: <span className="font-medium">{qrSize}px</span>
                  </span>
                  <span className="flex gap-2">
                    <span>
                      Color: <span className="font-mono">{foreground}</span>
                    </span>
                    <span>
                      Fondo: <span className="font-mono">{background}</span>
                    </span>
                  </span>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={isValueEmpty}
                    onClick={handleDownloadSvg}
                  >
                    Descargar SVG
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    type="button"
                    disabled={isValueEmpty}
                    onClick={handleDownloadPng}
                  >
                    Descargar PNG
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
            Hecho en 🇩🇴 por{" "}
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
