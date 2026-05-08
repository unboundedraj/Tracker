export type MiscTodo = {
  id: string;
  task: string;
  note?: string;
  createdAt: string; // ISO
};

export type MiscTodoDbDocument = {
  _id?: string;
  task: string;
  note?: string;
  createdAt: Date;
};
