// Tipos partilhados das playlists.
// Ficam num só sítio: duas definições com o mesmo nome em ficheiros
// diferentes são tipos distintos para o TypeScript, e o build falha.

export interface Music {
  id: string;
  title: string;
  artist?: string | null;
  duration: number;
  fileUrl: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  creator: { id: string; username: string; photoUrl?: string | null };
  musics: Music[];
  _count: { listeners: number };
  createdAt: string;
}
