import { 
  type Project, 
  type InsertProject,
  type Worker,
  type InsertWorker,
  type WorkHours,
  type InsertWorkHours,
  type Material,
  type InsertMaterial,
  type Expense,
  type InsertExpense
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Workers
  getWorker(id: string): Promise<Worker | undefined>;
  getAllWorkers(): Promise<Worker[]>;
  getActiveWorkers(): Promise<Worker[]>;
  createWorker(worker: InsertWorker): Promise<Worker>;
  updateWorker(id: string, updates: Partial<InsertWorker>): Promise<Worker | undefined>;
  deleteWorker(id: string): Promise<boolean>;

  // Work Hours
  getWorkHours(id: string): Promise<WorkHours | undefined>;
  getAllWorkHours(): Promise<WorkHours[]>;
  getWorkHoursByProject(projectId: string): Promise<WorkHours[]>;
  getWorkHoursByWorker(workerId: string): Promise<WorkHours[]>;
  getWorkHoursByDate(date: Date): Promise<WorkHours[]>;
  createWorkHours(workHours: InsertWorkHours): Promise<WorkHours>;
  updateWorkHours(id: string, updates: Partial<InsertWorkHours>): Promise<WorkHours | undefined>;
  deleteWorkHours(id: string): Promise<boolean>;

  // Materials
  getMaterial(id: string): Promise<Material | undefined>;
  getAllMaterials(): Promise<Material[]>;
  getMaterialsByProject(projectId: string): Promise<Material[]>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, updates: Partial<InsertMaterial>): Promise<Material | undefined>;
  deleteMaterial(id: string): Promise<boolean>;

  // Expenses
  getExpense(id: string): Promise<Expense | undefined>;
  getAllExpenses(): Promise<Expense[]>;
  getExpensesByProject(projectId: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, updates: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;
  private workers: Map<string, Worker>;
  private workHours: Map<string, WorkHours>;
  private materials: Map<string, Material>;
  private expenses: Map<string, Expense>;

  constructor() {
    this.projects = new Map();
    this.workers = new Map();
    this.workHours = new Map();
    this.materials = new Map();
    this.expenses = new Map();
  }

  // Projects
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = { 
      ...insertProject,
      id,
      status: insertProject.status ?? "planning",
      description: insertProject.description ?? null,
      estimatedBudget: insertProject.estimatedBudget ?? null,
      estimatedHours: insertProject.estimatedHours ?? null,
      clientName: insertProject.clientName ?? null,
      startDate: insertProject.startDate ?? null,
      endDate: insertProject.endDate ?? null,
      createdAt: new Date()
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Expenses
  async getExpense(id: string): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async getAllExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values());
  }

  async getExpensesByProject(projectId: string): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(
      expense => expense.projectId === projectId
    );
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const expense: Expense = { 
      ...insertExpense,
      id,
      receipt: insertExpense.receipt ?? null,
      createdAt: new Date()
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async updateExpense(id: string, updates: Partial<InsertExpense>): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;
    
    const updatedExpense = { ...expense, ...updates };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenses.delete(id);
  }

  // Workers
  async getWorker(id: string): Promise<Worker | undefined> {
    return this.workers.get(id);
  }

  async getAllWorkers(): Promise<Worker[]> {
    return Array.from(this.workers.values());
  }

  async getActiveWorkers(): Promise<Worker[]> {
    return Array.from(this.workers.values()).filter(
      worker => worker.isActive === "true"
    );
  }

  async createWorker(insertWorker: InsertWorker): Promise<Worker> {
    const id = randomUUID();
    const worker: Worker = { 
      ...insertWorker,
      id,
      isActive: insertWorker.isActive ?? "true",
      role: insertWorker.role ?? null,
      department: insertWorker.department ?? null,
      createdAt: new Date()
    };
    this.workers.set(id, worker);
    return worker;
  }

  async updateWorker(id: string, updates: Partial<InsertWorker>): Promise<Worker | undefined> {
    const worker = this.workers.get(id);
    if (!worker) return undefined;
    
    const updatedWorker = { ...worker, ...updates };
    this.workers.set(id, updatedWorker);
    return updatedWorker;
  }

  async deleteWorker(id: string): Promise<boolean> {
    return this.workers.delete(id);
  }

  // Work Hours
  async getWorkHours(id: string): Promise<WorkHours | undefined> {
    return this.workHours.get(id);
  }

  async getAllWorkHours(): Promise<WorkHours[]> {
    return Array.from(this.workHours.values());
  }

  async getWorkHoursByProject(projectId: string): Promise<WorkHours[]> {
    return Array.from(this.workHours.values()).filter(
      workHours => workHours.projectId === projectId
    );
  }

  async getWorkHoursByWorker(workerId: string): Promise<WorkHours[]> {
    return Array.from(this.workHours.values()).filter(
      workHours => workHours.workerId === workerId
    );
  }

  async getWorkHoursByDate(date: Date): Promise<WorkHours[]> {
    const targetDate = date.toISOString().split('T')[0];
    return Array.from(this.workHours.values()).filter(
      workHours => workHours.workDate.toISOString().split('T')[0] === targetDate
    );
  }

  async createWorkHours(insertWorkHours: InsertWorkHours): Promise<WorkHours> {
    const id = randomUUID();
    const workHours: WorkHours = { 
      ...insertWorkHours,
      id,
      startTime: insertWorkHours.startTime ?? null,
      endTime: insertWorkHours.endTime ?? null,
      description: insertWorkHours.description ?? null,
      taskType: insertWorkHours.taskType ?? null,
      createdAt: new Date()
    };
    this.workHours.set(id, workHours);
    return workHours;
  }

  async updateWorkHours(id: string, updates: Partial<InsertWorkHours>): Promise<WorkHours | undefined> {
    const workHours = this.workHours.get(id);
    if (!workHours) return undefined;
    
    const updatedWorkHours = { ...workHours, ...updates };
    this.workHours.set(id, updatedWorkHours);
    return updatedWorkHours;
  }

  async deleteWorkHours(id: string): Promise<boolean> {
    return this.workHours.delete(id);
  }

  // Materials
  async getMaterial(id: string): Promise<Material | undefined> {
    return this.materials.get(id);
  }

  async getAllMaterials(): Promise<Material[]> {
    return Array.from(this.materials.values());
  }

  async getMaterialsByProject(projectId: string): Promise<Material[]> {
    return Array.from(this.materials.values()).filter(
      material => material.projectId === projectId
    );
  }

  async createMaterial(insertMaterial: InsertMaterial): Promise<Material> {
    const id = randomUUID();
    const material: Material = { 
      ...insertMaterial,
      id,
      supplier: insertMaterial.supplier ?? null,
      purchaseDate: insertMaterial.purchaseDate ?? null,
      createdAt: new Date()
    };
    this.materials.set(id, material);
    return material;
  }

  async updateMaterial(id: string, updates: Partial<InsertMaterial>): Promise<Material | undefined> {
    const material = this.materials.get(id);
    if (!material) return undefined;
    
    const updatedMaterial = { ...material, ...updates };
    this.materials.set(id, updatedMaterial);
    return updatedMaterial;
  }

  async deleteMaterial(id: string): Promise<boolean> {
    return this.materials.delete(id);
  }
}

export const storage = new MemStorage();
