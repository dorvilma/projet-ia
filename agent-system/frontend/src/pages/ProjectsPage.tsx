import { useState } from 'react';
import { useProjects, useCreateProject } from '../hooks/useProjects';
import { Link } from 'react-router-dom';

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProject.mutateAsync({ name, description });
    setShowForm(false);
    setName('');
    setDescription('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          New Project
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="p-4 bg-card rounded-lg border space-y-3">
          <input type="text" placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-background" required />
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-background" rows={3} />
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md">Create</button>
        </form>
      )}
      {isLoading ? (
        <p>Loading projects...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.data?.map((p: any) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="block p-4 bg-card rounded-lg border shadow-sm hover:border-primary transition-colors">
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{p.description || 'No description'}</p>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span>{p._count?.tasks ?? 0} tasks</span>
                <span className="capitalize">{p.status?.toLowerCase()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
