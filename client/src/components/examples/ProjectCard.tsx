import { ProjectCard } from '../ProjectCard';

export default function ProjectCardExample() {
  const mockProject = {
    id: "1",
    name: "製品A開発",
    budget: 500000,
    spent: 320000,
    status: "active" as const
  };

  return (
    <div className="p-6 max-w-md">
      <ProjectCard project={mockProject} />
    </div>
  );
}