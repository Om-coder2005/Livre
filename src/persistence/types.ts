export interface LivreBook {
  id: string;
  title: string;
  author?: string;
  pageCount: number;
  coverUrl?: string; // Data URL of the first page thumbnail
  fileBlob: Blob;
  createdAt: number;
  updatedAt: number;
}

export interface BookProgress {
  bookId: string;
  lastPage: number;
  timestamp: number;
}

export interface BookBookmark {
  id: string;
  bookId: string;
  pageNum: number;
  label?: string;
  createdAt: number;
}
