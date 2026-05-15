// PINs are defined in env: AMPAV_PINS=manager:1234,staff:5678
// Returns { label } on success, null on failure

export type PinRole = "staff" | "manager"

type PinEntry = { pin: string; label: string; role: PinRole }

function loadPins(): PinEntry[] {
  const raw = process.env.AMPAV_PINS ?? ""
  if (!raw) {
    // Defaults for local dev — override via .env.local
    return [
      { pin: "1234", label: "Manager", role: "manager" },
      { pin: "5678", label: "Staff", role: "staff" },
    ]
  }
  return raw.split(",").map((entry) => {
    const [label, pin] = entry.split(":")
    const role: PinRole = label.toLowerCase().includes("manager") ? "manager" : "staff"
    return { pin: pin.trim(), label: label.trim(), role }
  })
}

export function verifyPin(pin: string): PinEntry | null {
  const entries = loadPins()
  return entries.find((e) => e.pin === pin) ?? null
}
