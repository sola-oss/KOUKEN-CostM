import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema,
  insertWorkerSchema,
  insertWorkHoursSchema,
  insertMaterialSchema,
  insertExpenseSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Projects routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid project data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, validatedData);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid project data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Workers routes
  app.get("/api/workers", async (req, res) => {
    try {
      const workers = await storage.getAllWorkers();
      res.json(workers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workers" });
    }
  });

  app.get("/api/workers/active", async (req, res) => {
    try {
      const workers = await storage.getActiveWorkers();
      res.json(workers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active workers" });
    }
  });

  app.post("/api/workers", async (req, res) => {
    try {
      const validatedData = insertWorkerSchema.parse(req.body);
      const worker = await storage.createWorker(validatedData);
      res.status(201).json(worker);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid worker data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create worker" });
    }
  });

  app.get("/api/workers/:id", async (req, res) => {
    try {
      const worker = await storage.getWorker(req.params.id);
      if (!worker) {
        return res.status(404).json({ error: "Worker not found" });
      }
      res.json(worker);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch worker" });
    }
  });

  app.put("/api/workers/:id", async (req, res) => {
    try {
      const validatedData = insertWorkerSchema.partial().parse(req.body);
      const worker = await storage.updateWorker(req.params.id, validatedData);
      if (!worker) {
        return res.status(404).json({ error: "Worker not found" });
      }
      res.json(worker);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid worker data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update worker" });
    }
  });

  app.delete("/api/workers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteWorker(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Worker not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete worker" });
    }
  });

  // Work Hours routes
  app.get("/api/work-hours/:id", async (req, res) => {
    try {
      const workHours = await storage.getWorkHours(req.params.id);
      if (!workHours) {
        return res.status(404).json({ error: "Work hours not found" });
      }
      res.json(workHours);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch work hours" });
    }
  });

  app.get("/api/work-hours", async (req, res) => {
    try {
      const { projectId, workerId, date } = req.query;
      
      if (projectId) {
        const workHours = await storage.getWorkHoursByProject(projectId as string);
        return res.json(workHours);
      }
      
      if (workerId) {
        const workHours = await storage.getWorkHoursByWorker(workerId as string);
        return res.json(workHours);
      }
      
      if (date) {
        const workHours = await storage.getWorkHoursByDate(new Date(date as string));
        return res.json(workHours);
      }
      
      const workHours = await storage.getAllWorkHours();
      res.json(workHours);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch work hours" });
    }
  });

  app.post("/api/work-hours", async (req, res) => {
    try {
      const validatedData = insertWorkHoursSchema.parse(req.body);
      
      // Check if project exists
      const project = await storage.getProject(validatedData.projectId);
      if (!project) {
        return res.status(400).json({ error: "Referenced project not found" });
      }
      
      // Check if worker exists
      const worker = await storage.getWorker(validatedData.workerId);
      if (!worker) {
        return res.status(400).json({ error: "Referenced worker not found" });
      }
      
      const workHours = await storage.createWorkHours(validatedData);
      res.status(201).json(workHours);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid work hours data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create work hours" });
    }
  });

  app.put("/api/work-hours/:id", async (req, res) => {
    try {
      const validatedData = insertWorkHoursSchema.partial().parse(req.body);
      
      // Check if project exists (if projectId is being updated)
      if (validatedData.projectId) {
        const project = await storage.getProject(validatedData.projectId);
        if (!project) {
          return res.status(400).json({ error: "Referenced project not found" });
        }
      }
      
      // Check if worker exists (if workerId is being updated)
      if (validatedData.workerId) {
        const worker = await storage.getWorker(validatedData.workerId);
        if (!worker) {
          return res.status(400).json({ error: "Referenced worker not found" });
        }
      }
      
      const workHours = await storage.updateWorkHours(req.params.id, validatedData);
      if (!workHours) {
        return res.status(404).json({ error: "Work hours not found" });
      }
      res.json(workHours);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid work hours data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update work hours" });
    }
  });

  app.delete("/api/work-hours/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteWorkHours(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Work hours not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete work hours" });
    }
  });

  // Materials routes
  app.get("/api/materials/:id", async (req, res) => {
    try {
      const material = await storage.getMaterial(req.params.id);
      if (!material) {
        return res.status(404).json({ error: "Material not found" });
      }
      res.json(material);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch material" });
    }
  });

  app.get("/api/materials", async (req, res) => {
    try {
      const { projectId } = req.query;
      
      if (projectId) {
        const materials = await storage.getMaterialsByProject(projectId as string);
        return res.json(materials);
      }
      
      const materials = await storage.getAllMaterials();
      res.json(materials);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch materials" });
    }
  });

  app.post("/api/materials", async (req, res) => {
    try {
      const validatedData = insertMaterialSchema.parse(req.body);
      
      // Check if project exists
      const project = await storage.getProject(validatedData.projectId);
      if (!project) {
        return res.status(400).json({ error: "Referenced project not found" });
      }
      
      // Calculate total cost automatically
      const materialWithTotal = {
        ...validatedData,
        totalCost: (parseFloat(validatedData.quantity.toString()) * parseFloat(validatedData.unitCost.toString())).toString()
      };
      
      const material = await storage.createMaterial(materialWithTotal);
      res.status(201).json(material);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid material data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create material" });
    }
  });

  app.put("/api/materials/:id", async (req, res) => {
    try {
      const validatedData = insertMaterialSchema.partial().parse(req.body);
      
      // Check if project exists (if projectId is being updated)
      if (validatedData.projectId) {
        const project = await storage.getProject(validatedData.projectId);
        if (!project) {
          return res.status(400).json({ error: "Referenced project not found" });
        }
      }
      
      // Auto-calculate total cost if quantity or unitCost are being updated
      let materialWithTotal = validatedData;
      if (validatedData.quantity || validatedData.unitCost) {
        const currentMaterial = await storage.getMaterial(req.params.id);
        if (!currentMaterial) {
          return res.status(404).json({ error: "Material not found" });
        }
        
        const quantity = validatedData.quantity ?? currentMaterial.quantity;
        const unitCost = validatedData.unitCost ?? currentMaterial.unitCost;
        materialWithTotal = {
          ...validatedData,
          totalCost: (parseFloat(quantity.toString()) * parseFloat(unitCost.toString())).toString()
        };
      }
      
      const material = await storage.updateMaterial(req.params.id, materialWithTotal);
      if (!material) {
        return res.status(404).json({ error: "Material not found" });
      }
      res.json(material);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid material data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update material" });
    }
  });

  app.delete("/api/materials/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMaterial(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Material not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete material" });
    }
  });

  // Expenses routes
  app.get("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expense" });
    }
  });

  app.get("/api/expenses", async (req, res) => {
    try {
      const { projectId } = req.query;
      
      if (projectId) {
        const expenses = await storage.getExpensesByProject(projectId as string);
        return res.json(expenses);
      }
      
      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.parse(req.body);
      
      // Check if project exists
      const project = await storage.getProject(validatedData.projectId);
      if (!project) {
        return res.status(400).json({ error: "Referenced project not found" });
      }
      
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid expense data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.put("/api/expenses/:id", async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.partial().parse(req.body);
      
      // Check if project exists (if projectId is being updated)
      if (validatedData.projectId) {
        const project = await storage.getProject(validatedData.projectId);
        if (!project) {
          return res.status(400).json({ error: "Referenced project not found" });
        }
      }
      
      const expense = await storage.updateExpense(req.params.id, validatedData);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid expense data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
