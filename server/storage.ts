import { 
  type Project, 
  type InsertProject,
  type Expense,
  type InsertExpense,
  type CostCategory,
  type InsertCostCategory
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Expenses
  getExpense(id: string): Promise<Expense | undefined>;
  getAllExpenses(): Promise<Expense[]>;
  getExpensesByProject(projectId: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, updates: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  // Cost Categories
  getCostCategory(id: string): Promise<CostCategory | undefined>;
  getAllCostCategories(): Promise<CostCategory[]>;
  createCostCategory(category: InsertCostCategory): Promise<CostCategory>;
  updateCostCategory(id: string, updates: Partial<InsertCostCategory>): Promise<CostCategory | undefined>;
  deleteCostCategory(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;
  private expenses: Map<string, Expense>;
  private costCategories: Map<string, CostCategory>;

  constructor() {
    this.projects = new Map();
    this.expenses = new Map();
    this.costCategories = new Map();
    
    // Initialize with default cost categories
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    const defaultCategories = [
      { name: "材料費", color: "hsl(var(--chart-1))", description: "原材料や部品にかかる費用" },
      { name: "人件費", color: "hsl(var(--chart-2))", description: "従業員の給与や労働費" },
      { name: "設備費", color: "hsl(var(--chart-3))", description: "機械や設備の費用" },
      { name: "間接費", color: "hsl(var(--chart-4))", description: "その他の間接的な費用" },
    ];

    for (const category of defaultCategories) {
      await this.createCostCategory(category);
    }
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

  // Cost Categories
  async getCostCategory(id: string): Promise<CostCategory | undefined> {
    return this.costCategories.get(id);
  }

  async getAllCostCategories(): Promise<CostCategory[]> {
    return Array.from(this.costCategories.values());
  }

  async createCostCategory(insertCategory: InsertCostCategory): Promise<CostCategory> {
    const id = randomUUID();
    const category: CostCategory = { ...insertCategory, id };
    this.costCategories.set(id, category);
    return category;
  }

  async updateCostCategory(id: string, updates: Partial<InsertCostCategory>): Promise<CostCategory | undefined> {
    const category = this.costCategories.get(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...updates };
    this.costCategories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCostCategory(id: string): Promise<boolean> {
    return this.costCategories.delete(id);
  }
}

export const storage = new MemStorage();
