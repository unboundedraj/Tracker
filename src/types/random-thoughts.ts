export interface RandomThought {
  id: string;
  content: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string; // ISO string for client-side
}

export interface RandomThoughtDbDocument {
  _id: any; // ObjectId from MongoDB
  content: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: Date;
}
