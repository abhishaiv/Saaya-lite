export const PIN_LENGTH = 4; // fact: pin.length
const SEQUENTIAL_WEAK_PIN = "1234"; // fact: pin.rejected.1234

export function hasFavouriteInput(name: string, phone: string): boolean {
  return name.trim().length > 0 && phone.trim().length > 0;
}

export function isCompletePin(value: string): boolean {
  return value.length === PIN_LENGTH;
}

export function isWeakPin(pin: string): boolean {
  const [firstDigit] = pin;
  return (
    pin === SEQUENTIAL_WEAK_PIN ||
    (firstDigit !== undefined && [...pin].every((digit) => digit === firstDigit))
  );
}
