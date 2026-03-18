import { useEffect, useRef, useState } from "react"

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
import { ClipboardCopy, Github, Loader2, Share2 } from "lucide-react"

type QrSize = "small" | "medium" | "large"
type QrErrorLevel = "L" | "M" | "Q" | "H"

const sizeToPixels: Record<QrSize, number> = {
  small: 160,
  medium: 220,
  large: 280,
}

const HISTORY_KEY = "qr-studio-history"
const MAX_HISTORY = 20

interface HistoryEntry {
  id: string
  mode: string
  /** Texto corto en la lista (p. ej. dominio para URL, sin mostrar el enlace completo). */
  label: string
  /** Contenido completo del QR (para copiar). Opcional en entradas antiguas. */
  payload?: string
  createdAt: number
  state: Record<string, unknown>
}

function shortUrlDisplay(raw: string, lang: "es" | "en"): string {
  const t = raw.trim()
  if (!t) return lang === "es" ? "Sin URL" : "No URL"
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`
    const u = new URL(withProto)
    const host = u.hostname.replace(/^www\./i, "")
    return host || (lang === "es" ? "Enlace" : "Link")
  } catch {
    return lang === "es" ? "Enlace" : "Link"
  }
}

function qrPayloadFromHistoryState(s: Record<string, unknown>): string {
  const mode = s.mode
  const value = typeof s.value === "string" ? s.value : ""
  const callNumber = typeof s.callNumber === "string" ? s.callNumber : ""
  const emailTo = typeof s.emailTo === "string" ? s.emailTo : ""
  const emailSubject = typeof s.emailSubject === "string" ? s.emailSubject : ""
  const emailBody = typeof s.emailBody === "string" ? s.emailBody : ""
  const smsNumber = typeof s.smsNumber === "string" ? s.smsNumber : ""
  const smsBody = typeof s.smsBody === "string" ? s.smsBody : ""
  const waNumber = typeof s.waNumber === "string" ? s.waNumber : ""
  const waMessage = typeof s.waMessage === "string" ? s.waMessage : ""
  const vcardName = typeof s.vcardName === "string" ? s.vcardName : ""
  const vcardPhone = typeof s.vcardPhone === "string" ? s.vcardPhone : ""
  const vcardEmail = typeof s.vcardEmail === "string" ? s.vcardEmail : ""
  const wifiSsid = typeof s.wifiSsid === "string" ? s.wifiSsid : ""
  const wifiPassword = typeof s.wifiPassword === "string" ? s.wifiPassword : ""
  const wifiSecurity =
    s.wifiSecurity === "WPA" || s.wifiSecurity === "WEP" || s.wifiSecurity === "nopass"
      ? s.wifiSecurity
      : "WPA"
  const wifiHidden = s.wifiHidden === true

  if (mode === "wifi") {
    return `WIFI:T:${wifiSecurity};S:${wifiSsid};${
      wifiSecurity !== "nopass" && wifiPassword ? `P:${wifiPassword};` : ""
    }${wifiHidden ? "H:true;" : ""};`
  }
  if (mode === "call") {
    return `tel:${callNumber.trim().replace(/\s/g, "")}`
  }
  if (mode === "email") {
    const to = emailTo.trim()
    const sub = emailSubject.trim()
    const body = emailBody.trim()
    return `mailto:${encodeURIComponent(to)}${sub ? `?subject=${encodeURIComponent(sub)}` : ""}${body ? `${sub ? "&" : "?"}body=${encodeURIComponent(body)}` : ""}`
  }
  if (mode === "sms") {
    return `sms:${smsNumber.trim().replace(/\s/g, "")}${smsBody.trim() ? `?body=${encodeURIComponent(smsBody.trim())}` : ""}`
  }
  if (mode === "whatsapp") {
    return `https://wa.me/${waNumber.replace(/\D/g, "")}${waMessage.trim() ? `?text=${encodeURIComponent(waMessage.trim())}` : ""}`
  }
  if (mode === "vcard") {
    return `BEGIN:VCARD\nVERSION:3.0\nFN:${vcardName.trim().replace(/\n/g, " ")}\n${vcardPhone.trim() ? `TEL:${vcardPhone.trim().replace(/\s/g, "")}\n` : ""}${vcardEmail.trim() ? `EMAIL:${vcardEmail.trim()}\n` : ""}END:VCARD`
  }
  return value
}

export function App() {
  const [value, setValue] = useState("")
  const [notes, setNotes] = useState("")
  const [mode, setMode] = useState<
    "url" | "wifi" | "call" | "email" | "sms" | "whatsapp" | "vcard"
  >("url")
  const [callNumber, setCallNumber] = useState("")
  const [emailTo, setEmailTo] = useState("")
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [smsNumber, setSmsNumber] = useState("")
  const [smsBody, setSmsBody] = useState("")
  const [waNumber, setWaNumber] = useState("")
  const [waMessage, setWaMessage] = useState("")
  const [vcardName, setVcardName] = useState("")
  const [vcardPhone, setVcardPhone] = useState("")
  const [vcardEmail, setVcardEmail] = useState("")
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
  const [qrErrorLevel, setQrErrorLevel] = useState<QrErrorLevel>("M")
  const [foreground, setForeground] = useState("#020617") // slate-950
  const [background, setBackground] = useState("#f8fafc") // slate-50
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [qrActionsBusy, setQrActionsBusy] = useState(false)
  const qrActionLockRef = useRef(false)
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryEntry[]
        setHistory(Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [])
      }
    } catch {
      setHistory([])
    }
  }, [])

  const qrSize = sizeToPixels[size]
  const qrPayload =
    mode === "wifi"
      ? `WIFI:T:${wifiSecurity};S:${wifiSsid};${
          wifiSecurity !== "nopass" && wifiPassword ? `P:${wifiPassword};` : ""
        }${wifiHidden ? "H:true;" : ""};`
      : mode === "call"
        ? `tel:${callNumber.trim().replace(/\s/g, "")}`
        : mode === "email"
          ? `mailto:${encodeURIComponent(emailTo.trim())}${emailSubject.trim() ? `?subject=${encodeURIComponent(emailSubject.trim())}` : ""}${emailBody.trim() ? `${emailSubject.trim() ? "&" : "?"}body=${encodeURIComponent(emailBody.trim())}` : ""}`
          : mode === "sms"
            ? `sms:${smsNumber.trim().replace(/\s/g, "")}${smsBody.trim() ? `?body=${encodeURIComponent(smsBody.trim())}` : ""}`
            : mode === "whatsapp"
              ? `https://wa.me/${waNumber.replace(/\D/g, "")}${waMessage.trim() ? `?text=${encodeURIComponent(waMessage.trim())}` : ""}`
              : mode === "vcard"
                  ? `BEGIN:VCARD\nVERSION:3.0\nFN:${vcardName.trim().replace(/\n/g, " ")}\n${vcardPhone.trim() ? `TEL:${vcardPhone.trim().replace(/\s/g, "")}\n` : ""}${vcardEmail.trim() ? `EMAIL:${vcardEmail.trim()}\n` : ""}END:VCARD`
                  : value
  const isQrEmpty =
    mode === "wifi"
      ? !wifiSsid.trim() || (wifiSecurity !== "nopass" && !wifiPassword.trim())
      : mode === "call"
        ? !callNumber.trim()
        : mode === "email"
          ? !emailTo.trim()
          : mode === "sms"
            ? !smsNumber.trim()
            : mode === "whatsapp"
              ? !waNumber.trim()
              : mode === "vcard"
                  ? !vcardName.trim()
                  : value.trim().length === 0
  const qrRef = useRef<HTMLDivElement | null>(null)

  function getCurrentSnapshot(): HistoryEntry["state"] {
    return {
      mode,
      value,
      callNumber,
      emailTo,
      emailSubject,
      emailBody,
      smsNumber,
      smsBody,
      waNumber,
      waMessage,
      vcardName,
      vcardPhone,
      vcardEmail,
      wifiSsid,
      wifiPassword,
      wifiSecurity,
      wifiHidden,
      size,
      foreground,
      background,
    }
  }

  function loadFromHistory(entry: HistoryEntry) {
    const s = entry.state as Record<string, unknown>
    const modeVal = s.mode
    if (modeVal === "url" || modeVal === "wifi" || modeVal === "call" || modeVal === "email" || modeVal === "sms" || modeVal === "whatsapp" || modeVal === "vcard") setMode(modeVal)
    if (typeof s.value === "string") setValue(s.value)
    if (typeof s.callNumber === "string") setCallNumber(s.callNumber)
    if (typeof s.emailTo === "string") setEmailTo(s.emailTo)
    if (typeof s.emailSubject === "string") setEmailSubject(s.emailSubject)
    if (typeof s.emailBody === "string") setEmailBody(s.emailBody)
    if (typeof s.smsNumber === "string") setSmsNumber(s.smsNumber)
    if (typeof s.smsBody === "string") setSmsBody(s.smsBody)
    if (typeof s.waNumber === "string") setWaNumber(s.waNumber)
    if (typeof s.waMessage === "string") setWaMessage(s.waMessage)
    if (typeof s.vcardName === "string") setVcardName(s.vcardName)
    if (typeof s.vcardPhone === "string") setVcardPhone(s.vcardPhone)
    if (typeof s.vcardEmail === "string") setVcardEmail(s.vcardEmail)
    if (typeof s.wifiSsid === "string") setWifiSsid(s.wifiSsid)
    if (typeof s.wifiPassword === "string") setWifiPassword(s.wifiPassword)
    if (s.wifiSecurity === "WPA" || s.wifiSecurity === "WEP" || s.wifiSecurity === "nopass") setWifiSecurity(s.wifiSecurity)
    if (typeof s.wifiHidden === "boolean") setWifiHidden(s.wifiHidden)
    if (s.size === "small" || s.size === "medium" || s.size === "large") setSize(s.size)
    if (typeof s.foreground === "string") setForeground(s.foreground)
    if (typeof s.background === "string") setBackground(s.background)
  }

  function addToHistory() {
    const label =
      mode === "url"
        ? shortUrlDisplay(value, language)
        : mode === "wifi"
          ? wifiSsid
          : mode === "call"
            ? callNumber
            : mode === "email"
              ? emailTo
              : mode === "sms"
                ? smsNumber
                : mode === "whatsapp"
                  ? waNumber
                  : mode === "vcard"
                    ? vcardName
                    : ""
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      mode,
      label: label || mode,
      payload: qrPayload,
      createdAt: Date.now(),
      state: getCurrentSnapshot(),
    }
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY)
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      } catch {
        /**/
      }
      return next
    })
  }

  function validateBeforeAction(): boolean {
    if (mode === "call" || mode === "sms" || mode === "whatsapp") {
      const num = mode === "call" ? callNumber : mode === "sms" ? smsNumber : waNumber
      const trimmed = num.trim().replace(/\s/g, "")
      if (trimmed.length > 0 && !trimmed.startsWith("+")) {
        toast.error(
          language === "es"
            ? "El número debe incluir el código de país (ej. +1 809)."
            : "Number must include country code (e.g. +1 809).",
        )
        return false
      }
    }
    if (mode === "email" && emailTo.trim()) {
      if (!emailTo.includes("@")) {
        toast.error(
          language === "es"
            ? "Introduce una dirección de correo válida."
            : "Enter a valid email address.",
        )
        return false
      }
    }
    return true
  }

  /** Evita dobles clics: una sola acción de QR a la vez (descargas, copiar, compartir). */
  async function runQrAction(fn: () => Promise<void>) {
    if (qrActionLockRef.current) return
    qrActionLockRef.current = true
    setQrActionsBusy(true)
    try {
      await fn()
    } finally {
      qrActionLockRef.current = false
      setQrActionsBusy(false)
    }
  }

  async function handleSubmitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (feedbackSubmitting) return

    if (!feedbackMessage.trim()) {
      toast.error(
        language === "es"
          ? "Por favor escribe un mensaje de feedback."
          : "Please write a feedback message."
      )
      return
    }

    setFeedbackSubmitting(true)
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
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  async function executeDownloadSvg() {
    if (isQrEmpty || !validateBeforeAction()) return
    const container = qrRef.current
    const svg = container?.querySelector("svg") as SVGSVGElement | null
    if (!svg) return

    addToHistory()
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
    await new Promise((r) => setTimeout(r, 450))
  }

  async function executeDownloadPng() {
    if (isQrEmpty || !validateBeforeAction()) return
    const container = qrRef.current
    const svg = container?.querySelector("svg") as SVGSVGElement | null
    if (!svg) return

    addToHistory()
    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svg)
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svgBlob)

    await new Promise<void>((resolve) => {
      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = qrSize * 2
        canvas.height = qrSize * 2

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          URL.revokeObjectURL(url)
          resolve()
          return
        }

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
        resolve()
      }

      image.onerror = () => {
        URL.revokeObjectURL(url)
        toast.error(
          language === "es"
            ? "No se pudo generar el PNG."
            : "PNG could not be generated."
        )
        resolve()
      }

      image.src = url
    })
  }

  const shortcutDownloadPngRef = useRef<() => void>(() => {})
  shortcutDownloadPngRef.current = () => {
    void runQrAction(() => executeDownloadPng())
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isQrEmpty) {
        e.preventDefault()
        shortcutDownloadPngRef.current()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isQrEmpty])

  async function handleCopyContent() {
    if (isQrEmpty || !validateBeforeAction()) return
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

  async function executeShare() {
    if (isQrEmpty || !validateBeforeAction()) return
    const container = qrRef.current
    const svg = container?.querySelector("svg") as SVGSVGElement | null
    if (!svg) return

    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svg)
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" })
    const objectUrl = URL.createObjectURL(svgBlob)

    await new Promise<void>((resolve) => {
      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = qrSize * 2
        canvas.height = qrSize * 2
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          URL.revokeObjectURL(objectUrl)
          resolve()
          return
        }
        ctx.fillStyle = background
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

        canvas.toBlob(async (blob) => {
          try {
            URL.revokeObjectURL(objectUrl)
            if (!blob) {
              toast.error(
                language === "es"
                  ? "No se pudo generar la imagen."
                  : "Could not generate image.",
              )
              return
            }

            const file = new File([blob], "qr-studio.png", {
              type: "image/png",
            })
            try {
              if (
                typeof navigator.share === "function" &&
                navigator.canShare?.({ files: [file] })
              ) {
                await navigator.share({
                  files: [file],
                  title:
                    language === "es" ? "Código QR" : "QR Code",
                  text:
                    language === "es"
                      ? "Código QR (QR Studio)"
                      : "QR code (QR Studio)",
                })
                addToHistory()
                toast.success(
                  language === "es"
                    ? "Compartido correctamente."
                    : "Shared successfully.",
                )
              } else if (typeof navigator.share === "function") {
                await navigator.share({
                  title: "QR Studio",
                  text: qrPayload,
                  url: window.location.href,
                })
                toast.success(
                  language === "es"
                    ? "Listo para compartir."
                    : "Ready to share.",
                )
              } else {
                toast.message(
                  language === "es"
                    ? "Tu navegador no permite compartir. Usa Descargar PNG."
                    : "Sharing not supported. Use Download PNG.",
                )
              }
            } catch (err) {
              if ((err as Error).name !== "AbortError") {
                toast.error(
                  language === "es"
                    ? "No se pudo compartir."
                    : "Could not share.",
                )
              }
            }
          } finally {
            resolve()
          }
        }, "image/png")
      }

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        toast.error(
          language === "es"
            ? "No se pudo generar el PNG."
            : "Could not generate PNG.",
        )
        resolve()
      }

      image.src = objectUrl
    })
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
            <p className="hidden text-[0.7rem] text-muted-foreground sm:inline">
              {language === "es" ? "Pulsa" : "Press"}{" "}
              <kbd className="rounded bg-muted px-1 text-[0.65rem]">d</kbd>{" "}
              {language === "es" ? "para alternar tema." : "to toggle theme."}
            </p>
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
                    disabled={feedbackSubmitting}
                    className="gap-2 px-4 text-[0.8rem]"
                  >
                    {feedbackSubmitting ? (
                      <>
                        <Loader2
                          className="size-3.5 shrink-0 animate-spin"
                          aria-hidden
                        />
                        {language === "es" ? "Enviando…" : "Sending…"}
                      </>
                    ) : language === "es" ? (
                      "Enviar"
                    ) : (
                      "Send"
                    )}
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
                  <div className="flex flex-wrap gap-1.5 text-[0.75rem]">
                    <button
                      type="button"
                      onClick={() => setMode("url")}
                      className={`rounded-full px-2.5 py-1 transition-colors ${
                        mode === "url"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {language === "es" ? "URL" : "URL"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("wifi")}
                      className={`rounded-full px-2.5 py-1 transition-colors ${
                        mode === "wifi"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Wi‑Fi
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("call")}
                      className={`rounded-full px-2.5 py-1 transition-colors ${
                        mode === "call"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {language === "es" ? "Llamada" : "Call"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("email")}
                      className={`rounded-full px-2.5 py-1 transition-colors ${
                        mode === "email"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("sms")}
                      className={`rounded-full px-2.5 py-1 transition-colors ${
                        mode === "sms"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("whatsapp")}
                      className={`rounded-full px-2.5 py-1 transition-colors ${
                        mode === "whatsapp"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("vcard")}
                      className={`rounded-full px-2.5 py-1 transition-colors ${
                        mode === "vcard"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {language === "es" ? "Contacto" : "Contact"}
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
                ) : mode === "call" ? (
                  <div className="space-y-2">
                    <Label htmlFor="call-number">
                      {language === "es"
                        ? "Número de teléfono (código de país obligatorio)"
                        : "Phone number (country code required)"}
                    </Label>
                    <Input
                      id="call-number"
                      type="tel"
                      inputMode="numeric"
                      value={callNumber}
                      onChange={(event) => {
                        const raw = event.target.value.replace(
                          /[^\d+\s\-()]/g,
                          "",
                        )
                        const digits = raw.replace(/\D/g, "")
                        if (digits.length <= 15) setCallNumber(raw)
                      }}
                      placeholder="+1 809 555 1234"
                      maxLength={25}
                    />
                    <p className="text-[0.7rem] text-muted-foreground">
                      {language === "es"
                        ? "Al escanear el QR se abrirá la app de llamadas con este número."
                        : "Scanning the QR will open the phone app with this number."}
                    </p>
                  </div>
                ) : mode === "email" ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email-to">
                          {language === "es"
                            ? "Correo electrónico"
                            : "Email"}
                        </Label>
                        <Input
                          id="email-to"
                          type="email"
                          value={emailTo}
                          onChange={(event) => setEmailTo(event.target.value)}
                          placeholder={
                            language === "es"
                              ? "Tu dirección de correo electrónico"
                              : "Your email address"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-subject">
                          {language === "es" ? "Asunto" : "Subject"}
                        </Label>
                        <Input
                          id="email-subject"
                          type="text"
                          value={emailSubject}
                          onChange={(event) =>
                            setEmailSubject(event.target.value)
                          }
                          placeholder={
                            language === "es"
                              ? "Asunto del correo"
                              : "Email subject"
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-body">
                        {language === "es" ? "Mensaje" : "Message"}
                      </Label>
                      <Textarea
                        id="email-body"
                        value={emailBody}
                        onChange={(event) => setEmailBody(event.target.value)}
                        placeholder={
                          language === "es" ? "Mensaje" : "Message"
                        }
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                  </div>
                ) : mode === "sms" ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="sms-number">
                        {language === "es"
                          ? "Número de teléfono (código de país obligatorio)"
                          : "Phone number (country code required)"}
                      </Label>
                      <Input
                        id="sms-number"
                        type="tel"
                        inputMode="numeric"
                        value={smsNumber}
                        onChange={(event) => {
                          const raw = event.target.value.replace(
                            /[^\d+\s\-()]/g,
                            "",
                          )
                          const digits = raw.replace(/\D/g, "")
                          if (digits.length <= 15) setSmsNumber(raw)
                        }}
                        placeholder="+1 809 555 1234"
                        maxLength={25}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sms-body">
                        {language === "es"
                          ? "Mensaje (opcional)"
                          : "Message (optional)"}
                      </Label>
                      <Textarea
                        id="sms-body"
                        value={smsBody}
                        onChange={(event) => setSmsBody(event.target.value)}
                        placeholder={
                          language === "es"
                            ? "Texto del SMS..."
                            : "SMS text..."
                        }
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  </div>
                ) : mode === "whatsapp" ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="wa-number">
                        {language === "es"
                          ? "Número (código de país obligatorio)"
                          : "Number (country code required)"}
                      </Label>
                      <Input
                        id="wa-number"
                        type="tel"
                        inputMode="numeric"
                        value={waNumber}
                        onChange={(event) => {
                          const raw = event.target.value.replace(
                            /[^\d+\s\-()]/g,
                            "",
                          )
                          const digits = raw.replace(/\D/g, "")
                          if (digits.length <= 15) setWaNumber(raw)
                        }}
                        placeholder="+1 809 555 1234"
                        maxLength={25}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wa-message">
                        {language === "es"
                          ? "Mensaje (opcional)"
                          : "Message (optional)"}
                      </Label>
                      <Textarea
                        id="wa-message"
                        value={waMessage}
                        onChange={(event) => setWaMessage(event.target.value)}
                        placeholder={
                          language === "es"
                            ? "Mensaje para WhatsApp..."
                            : "WhatsApp message..."
                        }
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  </div>
                ) : mode === "vcard" ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="vcard-name">
                        {language === "es" ? "Nombre completo" : "Full name"}
                      </Label>
                      <Input
                        id="vcard-name"
                        type="text"
                        value={vcardName}
                        onChange={(event) =>
                          setVcardName(event.target.value)
                        }
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="vcard-phone">
                          {language === "es"
                            ? "Teléfono (opcional)"
                            : "Phone (optional)"}
                        </Label>
                        <Input
                          id="vcard-phone"
                          type="tel"
                          value={vcardPhone}
                          onChange={(event) =>
                            setVcardPhone(
                              event.target.value.replace(
                                /[^\d+\s\-()]/g,
                                "",
                              ),
                            )
                          }
                          placeholder="+1 809 555 1234"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vcard-email">
                          {language === "es"
                            ? "Email (opcional)"
                            : "Email (optional)"}
                        </Label>
                        <Input
                          id="vcard-email"
                          type="email"
                          value={vcardEmail}
                          onChange={(event) =>
                            setVcardEmail(event.target.value)
                          }
                          placeholder="juan@ejemplo.com"
                        />
                      </div>
                    </div>
                    <p className="text-[0.7rem] text-muted-foreground">
                      {language === "es"
                        ? "Al escanear se podrá añadir el contacto al teléfono."
                        : "Scanning will allow adding the contact to the phone."}
                    </p>
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
                  <Label htmlFor="qr-error-level">
                    {language === "es"
                      ? "Corrección de errores"
                      : "Error correction"}
                  </Label>
                  <Select
                    value={qrErrorLevel}
                    onValueChange={(next) =>
                      setQrErrorLevel(next as QrErrorLevel)
                    }
                  >
                    <SelectTrigger id="qr-error-level" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">L (7%)</SelectItem>
                      <SelectItem value="M">M (15%)</SelectItem>
                      <SelectItem value="Q">Q (25%)</SelectItem>
                      <SelectItem value="H">H (30%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {language === "es" ? "Presets" : "Presets"}
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setForeground("#f8fafc")
                        setBackground("#020617")
                      }}
                    >
                      {language === "es" ? "Oscuro" : "Dark"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setForeground("#020617")
                        setBackground("#f8fafc")
                      }}
                    >
                      {language === "es" ? "Claro" : "Light"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setForeground("#1e3a5f")
                        setBackground("#ffffff")
                      }}
                    >
                      {language === "es" ? "Corporativo" : "Corporate"}
                    </Button>
                  </div>
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
                        ? mode === "url"
                          ? "Escribe un texto o URL para generar tu código QR."
                          : mode === "wifi"
                            ? "Completa el nombre de red y la contraseña (si aplica)."
                            : mode === "call"
                              ? "Añade un número con código de país (ej. +1 809)."
                              : mode === "email"
                                ? "Introduce al menos la dirección de correo."
                                : mode === "sms"
                                  ? "Añade el número con código de país."
                                  : mode === "whatsapp"
                                    ? "Añade el número con código de país."
                                    : mode === "vcard"
                                      ? "Escribe el nombre del contacto."
                                      : "Completa los datos para generar el QR."
                        : mode === "url"
                          ? "Type some text or a URL to generate your QR code."
                          : mode === "wifi"
                            ? "Enter network name and password (if required)."
                            : mode === "call"
                              ? "Add a number with country code (e.g. +1 809)."
                              : mode === "email"
                                ? "Enter at least the email address."
                                : mode === "sms"
                                  ? "Add number with country code."
                                  : mode === "whatsapp"
                                    ? "Add number with country code."
                                    : mode === "vcard"
                                      ? "Enter the contact name."
                                      : "Complete the fields to generate the QR."}
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
                          level={qrErrorLevel}
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
                    disabled={isQrEmpty || qrActionsBusy}
                    onClick={() => void runQrAction(() => executeShare())}
                    className="gap-1.5"
                  >
                    <Share2 className="size-3.5" />
                    {language === "es" ? "Compartir" : "Share"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={isQrEmpty || qrActionsBusy}
                    onClick={() =>
                      void runQrAction(async () => {
                        await handleCopyContent()
                      })
                    }
                  >
                    {language === "es" ? "Copiar" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={isQrEmpty || qrActionsBusy}
                    onClick={() =>
                      void runQrAction(() => executeDownloadSvg())
                    }
                  >
                    {language === "es" ? "Descargar SVG" : "Download SVG"}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    type="button"
                    disabled={isQrEmpty || qrActionsBusy}
                    onClick={() =>
                      void runQrAction(() => executeDownloadPng())
                    }
                  >
                    {language === "es" ? "Descargar PNG" : "Download PNG"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          {history.length > 0 && (
            <section className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6">
              <h2 className="mb-2 text-sm font-medium text-foreground">
                {language === "es" ? "Historial" : "History"}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[0.8rem]"
                  >
                    <button
                      type="button"
                      onClick={() => loadFromHistory(entry)}
                      className="min-w-0 flex-1 truncate text-left text-muted-foreground hover:text-foreground"
                    >
                      <span className="font-medium capitalize">{entry.mode}</span>
                      <span className="ml-1.5 truncate">— {entry.label}</span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                      title={
                        language === "es"
                          ? "Copiar contenido del QR (URL o texto completo)"
                          : "Copy full QR content (URL or payload)"
                      }
                      aria-label={
                        language === "es"
                          ? "Copiar contenido del QR"
                          : "Copy QR content"
                      }
                      onClick={async (e) => {
                        e.stopPropagation()
                        const text =
                          entry.payload ??
                          qrPayloadFromHistoryState(entry.state)
                        try {
                          await navigator.clipboard.writeText(text)
                          toast.success(
                            language === "es"
                              ? "Copiado al portapapeles."
                              : "Copied to clipboard.",
                          )
                        } catch {
                          toast.error(
                            language === "es"
                              ? "No se pudo copiar."
                              : "Could not copy.",
                          )
                        }
                      }}
                    >
                      <ClipboardCopy className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setHistory((prev) => {
                          const next = prev.filter((e) => e.id !== entry.id)
                          try {
                            localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
                          } catch {
                            /**/
                          }
                          return next
                        })
                      }}
                    >
                      {language === "es" ? "Borrar" : "Remove"}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
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
