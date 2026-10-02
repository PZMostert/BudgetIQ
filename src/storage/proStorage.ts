const PRO_KEY = "budgetiq_is_pro";

export function getIsPro(): boolean {
  return localStorage.getItem(PRO_KEY) === "true";
}

export function setIsPro(value: boolean): void {
  localStorage.setItem(PRO_KEY, String(value));
}