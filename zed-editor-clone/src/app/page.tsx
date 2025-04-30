'use client';
import { useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sun, Moon, Github } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// --- Types ---
type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: FileNode[];
};

const starterFiles: FileNode[] = [
  {
    id: "root-1",
    name: "src",
    type: "folder",
    children: [
      { id: "file-1", name: "index.tsx", type: "file", content: "// Type your code here\n" },
      { id: "file-2", name: "App.tsx", type: "file", content: "function App() {\n  return <div>Hello Zed!</div>;\n}" },
    ],
  },
  {
    id: "root-2",
    name: "README.md",
    type: "file",
    content: "# Zed Clone Demo\nEdit files & switch themes!\n",
  },
];

const themes = [
  { label: "Dark", value: "vs-dark" },
  { label: "Light", value: "light" },
  { label: "Dracula", value: "dracula" },
  { label: "Solarized", value: "solarized-dark" },
];

function getAllFiles(nodes: FileNode[], parent: FileNode[] = [], all: [FileNode, FileNode[]][] = []) {
  nodes.forEach((node) => {
    if (node.type === "file") all.push([node, parent]);
    if (node.type === "folder" && node.children) {
      getAllFiles(node.children, [...parent, node], all);
    }
  });
  return all;
}

export default function Home() {
  // --- State ---
  const [explorer, setExplorer] = useState<FileNode[]>(starterFiles);
  const [selectedId, setSelectedId] = useState<string | null>("file-1");
  const [theme, setTheme] = useState("vs-dark");
  const [copilotSuggestion, setCopilotSuggestion] = useState<string>(
    "function hello() {\n  // Copilot suggests...\n}"
  );

  // --- Theme Switch handler ---
  function handleThemeChange(val: string) {
    setTheme(val);
    // Here: update document class, color scheme, etc.
    if (val === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }

  // --- File Tree CRUD ---
  function addFile(parentId?: string) {
    const id = Math.random().toString(36).slice(2, 9);
    const name = prompt("Filename?")?.trim();
    if (!name) return;
    setExplorer((prev) => {
      function rec(nodes: FileNode[]): FileNode[] {
        return nodes.map((n) => {
          if (n.id === parentId && n.type === "folder") {
            return {
              ...n,
              children: [
                ...(n.children || []),
                { id, name, type: "file", content: "" },
              ],
            };
          } else if (n.children) {
            return { ...n, children: rec(n.children) };
          }
          return n;
        });
      }
      if (!parentId) return [...prev, { id, name, type: "file", content: "" }];
      return rec(prev);
    });
  }

  function addFolder(parentId?: string) {
    const id = Math.random().toString(36).slice(2, 9);
    const name = prompt("Folder name?")?.trim();
    if (!name) return;
    setExplorer((prev) => {
      function rec(nodes: FileNode[]): FileNode[] {
        return nodes.map((n) => {
          if (n.id === parentId && n.type === "folder") {
            return {
              ...n,
              children: [
                ...(n.children || []),
                { id, name, type: "folder", children: [] },
              ],
            };
          } else if (n.children) {
            return { ...n, children: rec(n.children) };
          }
          return n;
        });
      }
      if (!parentId) return [...prev, { id, name, type: "folder", children: [] }];
      return rec(prev);
    });
  }

  function renameNode(nodeId: string) {
    const name = prompt("Rename to?")?.trim();
    if (!name) return;
    setExplorer((prev) => {
      function rec(nodes: FileNode[]): FileNode[] {
        return nodes.map((n) => {
          if (n.id === nodeId) {
            return { ...n, name };
          } else if (n.children) {
            return { ...n, children: rec(n.children) };
          }
          return n;
        });
      }
      return rec(prev);
    });
  }

  function deleteNode(nodeId: string) {
    function rec(nodes: FileNode[]): FileNode[] {
      return nodes
        .filter((n) => n.id !== nodeId)
        .map((n) => n.children ? { ...n, children: rec(n.children) } : n);
    }
    setExplorer((prev) => rec(prev));
    if (selectedId === nodeId) setSelectedId(null);
  }

  // --- Find selected file ---
  let selectedFile: FileNode | undefined;
  getAllFiles(explorer).forEach(([node]) => {
    if (node.id === selectedId) selectedFile = node;
  });

  // --- File content handler ---
  function updateContent(newContent: string) {
    setExplorer((prev) => {
      function rec(nodes: FileNode[]): FileNode[] {
        return nodes.map((n) => {
          if (n.id === selectedId) {
            return { ...n, content: newContent };
          } else if (n.children) {
            return { ...n, children: rec(n.children) };
          }
          return n;
        });
      }
      return rec(prev);
    });
  }

  // --- Sidebar Tree ---
  function Explorer({ nodes, parentId }: { nodes: FileNode[]; parentId?: string }) {
    return (
      <ul className="pl-2">
        {nodes.map((node) => (
          <li key={node.id} className="flex items-center gap-1 group">
            {node.type === "folder" ? (
              <>
                <span className="font-semibold cursor-pointer" onClick={() => renameNode(node.id)}>
                  📁 {node.name}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">⋮</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => addFile(node.id)}>New File</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addFolder(node.id)}>New Folder</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => renameNode(node.id)}>Rename</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteNode(node.id)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {node.children && node.children.length > 0 && (
                  <div className="pl-4 border-l border-border ml-1 mt-1">
                    <Explorer nodes={node.children} parentId={node.id} />
                  </div>
                )}
              </>
            ) : (
              <>
                <span
                  onClick={() => setSelectedId(node.id)}
                  className={`pl-4 cursor-pointer flex-1 ${selectedId === node.id ? "bg-accent text-accent-foreground rounded" : "hover:underline"}`}
                  title={node.name}
                >
                  📝 {node.name}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">⋮</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => renameNode(node.id)}>Rename</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteNode(node.id)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </li>
        ))}
        <li>
          <div className="flex gap-1 mt-1">
            <Button size="sm" variant="ghost" onClick={() => addFile(parentId)}>＋ File</Button>
            <Button size="sm" variant="ghost" onClick={() => addFolder(parentId)}>＋ Folder</Button>
          </div>
        </li>
      </ul>
    );
  }

  // --- Top bar ---
  function TopBar() {
    // Placeholder GitHub login - swap with real login controls
    return (
      <div className="flex justify-between items-center px-4 py-1 bg-zinc-900 text-white border-b border-border h-12">
        <div className="flex items-center gap-3">
          <span className="font-bold text-xl tracking-tight mr-4">🟣 Zed Clone</span>
        </div>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Sun className="w-4 h-4" /> Theme
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {themes.map((t) => (
                <DropdownMenuItem key={t.value} onClick={() => handleThemeChange(t.value)}>
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* GitHub Login Placeholder */}
          <Button variant="outline" className="flex gap-2 border-zinc-600 text-white">
            <Github className="w-4 h-4" /> Login with GitHub
          </Button>
        </div>
      </div>
    );
  }

  // --- Status Bar ---
  function StatusBar() {
    return (
      <div className="h-6 px-3 flex items-center bg-zinc-900 text-zinc-400 border-t border-border text-xs">
        <span>Ln 1, Col 1</span>
        <span className="mx-2">|</span>
        <span>{selectedFile ? selectedFile.name : "No file selected"}</span>
        <span className="mx-2">|</span>
        <span>UTF-8</span>
      </div>
    );
  }

  // --- Main editor area ---
  return (
    <div className="w-full h-screen flex flex-col bg-background">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        {/* Sidebar: File explorer */}
        <Card className="w-64 h-full min-h-0 p-2 rounded-none border-r border-border bg-zinc-950 flex-shrink-0 overflow-y-auto">
          <h2 className="font-semibold text-lg pl-2 mb-2">Files</h2>
          <Explorer nodes={explorer} />
        </Card>
        {/* Editor */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tabs - Simple (future) */}
          <div className="h-9 flex items-center gap-2 border-b border-border px-2 bg-zinc-950">
            {getAllFiles(explorer).map(([node]) => (
              <Button key={node.id} size="sm" variant={selectedId === node.id ? "default" : "ghost"} onClick={() => setSelectedId(node.id)}>
                {node.name}
              </Button>
            ))}
          </div>
          <div className="flex-1 min-h-0 relative">
            {selectedFile ? (
              <MonacoEditor
                key={selectedFile.id}
                height="100%"
                defaultLanguage="typescript"
                theme={theme}
                value={selectedFile.content}
                onChange={(val) => updateContent(val || "")}
                options={{
                  fontFamily: "var(--font-geist-mono, monospace)",
                  minimap: { enabled: false },
                  fontLigatures: true,
                  fontSize: 15,
                }}
              />
            ) : (
              <div className="text-zinc-400 p-8 select-none">Select a file to edit</div>
            )}
            {/* Mock Copilot UI */}
            {selectedFile && (
              <div className="absolute bottom-8 left-8 p-2 rounded bg-black/70 text-green-300 text-xs max-w-xs shadow-lg">
                <span className="font-mono">{copilotSuggestion}</span>
                <Button size="xs" className="ml-2" variant="secondary" onClick={() => updateContent((selectedFile?.content ?? "") + "\n" + copilotSuggestion)}>
                  Accept Suggestion
                </Button>
                <span className="ml-4 text-zinc-500">(Fake Copilot Demo)</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
