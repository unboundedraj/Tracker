import type { ObjectId } from "mongodb";

export type ShoppingItem = {
  id: string;
  name: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string; // ISO
};

export type ShoppingItemDbDocument = {
  _id?: ObjectId;
  name: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: Date;
};