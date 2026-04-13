import React, { useEffect, useState } from "react";
import type { ProjectListItem } from "../types/reel";
import { listProjects, deleteProject } from "../api/client";

interface Props {
  onLoad: (projectId: string) => void;
  onNewProject: () => void;
}

const BACKEND_URL = "http://localhost:8000";

export default function ProjectLibrary({ onLoad, onNewProject }: Props) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const list = await listProjects();
      setProjects(list);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-gray-400 border-t-white rounded-full mx-auto mb-4" />
          <p>Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Your Reels</h2>
          <button
            type="button"
            onClick={onNewProject}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            + New Reel
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-2">No saved reels yet</p>
            <p className="text-gray-600 text-sm mb-6">
              Create your first reel to see it here
            </p>
            <button
              type="button"
              onClick={onNewProject}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Create Reel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onLoad(project.id)}
                className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-600 cursor-pointer transition-all hover:shadow-lg group"
              >
                {/* Thumbnail */}
                <div className="relative h-40 bg-gray-800">
                  {project.thumbnail_url ? (
                    <img
                      src={`${BACKEND_URL}${project.thumbnail_url}`}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <svg
                        className="w-12 h-12"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Slide count + duration overlay */}
                  <div className="absolute bottom-2 left-2 flex gap-1.5">
                    <span className="bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {project.slide_count} slides
                    </span>
                    <span className="bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {project.total_duration}s
                    </span>
                  </div>

                  {/* Rendered badge */}
                  {project.render_url && (
                    <span className="absolute top-2 right-2 bg-green-600/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                      Rendered
                    </span>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, project.id)}
                    className="absolute top-2 left-2 bg-black/60 hover:bg-red-600/80 text-white w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    title="Delete project"
                  >
                    X
                  </button>
                </div>

                {/* Info */}
                <div className="p-3 space-y-1">
                  <p className="text-sm font-medium text-white truncate">
                    {project.name || "Untitled Reel"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {project.prompt || "No prompt"}
                  </p>
                  <p className="text-[10px] text-gray-600">
                    {formatDate(project.updated_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
