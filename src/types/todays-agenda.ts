import type { ObjectId } from "mongodb";

export type TodaysAgendaItem = {
  id: string;
  task: string;
  isCompleted: boolean;
  createdAt: string;
  expiresAt: string;
};

export type TodaysAgendaItemDbDocument = {
  _id?: ObjectId;
  task: string;
  isCompleted: boolean;
  createdAt: Date;
  expiresAt: Date;
};
