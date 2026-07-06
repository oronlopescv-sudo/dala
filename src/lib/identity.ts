// Identidade do utilizador guardada localmente no dispositivo.
// Agora com suporte a login por email + password

export interface Identity {
  id: string;
  email: string;
  username: string;
  photoUrl: string | null;
  bio: string | null;
  country: string | null;
  language: string | null;
}

const IDENTITY_KEY = 'dafala.identity';
const TOKEN_KEY = 'dafala.token';

export function getIdentity(): Identity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveIdentity(identity: Identity, token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearIdentity(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(IDENTITY_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return getIdentity() !== null && getToken() !== null;
}

// Reduz uma imagem escolhida para um quadrado pequeno (data URL) — evita fotos gigantes.
export function fileToAvatarDataUrl(file: File, size = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler a imagem'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas indisponível'));
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
