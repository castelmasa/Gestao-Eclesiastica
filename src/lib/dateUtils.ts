import { Timestamp } from "firebase/firestore";

export function parseFirestoreDate(dateField: any): Date {
  if (!dateField) return new Date();
  
  if (dateField instanceof Date) {
    return dateField;
  }
  
  if (typeof dateField.toDate === 'function') {
    return dateField.toDate();
  }
  
  if (typeof dateField === 'string' || typeof dateField === 'number') {
    const parsed = new Date(dateField);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  
  // Fallback if it's an object that looks like a timestamp but isn't
  if (dateField.seconds) {
    return new Date(dateField.seconds * 1000);
  }
  
  return new Date();
}
