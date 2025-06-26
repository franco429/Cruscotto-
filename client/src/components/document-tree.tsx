import { useState, useMemo } from "react";
import { DocumentDocument as Document } from "../../../shared-types/schema";
import { cn } from "../lib/utils";
import {
  ChevronRight,
  File,
  Folder,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { ScrollArea } from "../components/ui/scroll-area";


interface TreeNode {
  path: string;
  label: string;
  level: number;
  children: TreeNode[];
  documents: Document[];
  hasWarning: boolean;
  hasError: boolean;
}

interface DocumentTreeProps {
  documents: Document[];
  onSelectDocument: (document: Document) => void;
}

export default function DocumentTree({
  documents,
  onSelectDocument,
}: DocumentTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    
    "1": true,
    "8": true,
    "8.2": true,
  });

  
  const buildTree = (docs: Document[]): TreeNode => {
    const root: TreeNode = {
      path: "",
      label: "Root",
      level: 0,
      children: [],
      documents: [],
      hasWarning: false,
      hasError: false,
    };

    
    const nodeMap: Record<string, TreeNode> = {
      "": root,
    };

    
    for (const doc of docs) {
      const parts = doc.path.split(".");
      let currentPath = "";

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const nextPath = currentPath ? `${currentPath}.${part}` : part;

        if (!nodeMap[nextPath]) {
          const newNode: TreeNode = {
            path: nextPath,
            label: `${nextPath} ${i === parts.length - 1 ? doc.title : ""}`,
            level: i + 1,
            children: [],
            documents: [],
            hasWarning: false,
            hasError: false,
          };

          nodeMap[nextPath] = newNode;
          const parentNode = nodeMap[currentPath];
          parentNode.children.push(newNode);
        }

        currentPath = nextPath;
      }

      // Add document to its node
      const node = nodeMap[doc.path];
      node.documents.push(doc);

   
      if (doc.alertStatus === "warning") {
        node.hasWarning = true;

        // Propagate warning up the tree
        let parentPath = doc.path.split(".").slice(0, -1).join(".");
        while (parentPath) {
          nodeMap[parentPath].hasWarning = true;
          parentPath = parentPath.split(".").slice(0, -1).join(".");
        }
        root.hasWarning = true;
      } else if (doc.alertStatus === "expired") {
        node.hasError = true;

        
        let parentPath = doc.path.split(".").slice(0, -1).join(".");
        while (parentPath) {
          nodeMap[parentPath].hasError = true;
          parentPath = parentPath.split(".").slice(0, -1).join(".");
        }
        root.hasError = true;
      }
    }

    return root;
  };


  const toggleNode = (path: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  
  const renderNode = (node: TreeNode): JSX.Element => {
    const isExpanded = expandedNodes[node.path];
    const hasChildren = node.children.length > 0;

    if (node.path === "") {
      
      return (
        <div className="space-y-1">
          {node.children.map((child) => renderNode(child))}
        </div>
      );
    }

    return (
      <div key={node.path} className="mb-1">
        <div className="flex items-center">
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.path)}
              className="flex items-center px-2 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer w-full"
            >
              <ChevronRight
                className={cn(
                  "mr-1 h-4 w-4 text-slate-400 transition-transform",
                  isExpanded ? "transform rotate-90" : ""
                )}
              />
              <Folder className="h-4 w-4 mr-2 text-slate-400" />
              <span>{node.path}</span>

              {/* Warning/Error indicators */}
              {node.hasError && (
                <AlertCircle className="ml-2 h-4 w-4 text-red-500" />
              )}
              {!node.hasError && node.hasWarning && (
                <AlertTriangle className="ml-2 h-4 w-4 text-amber-500" />
              )}
            </button>
          ) : (
            <div className="pl-7 pr-2 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
              <File className="h-4 w-4 mr-2 text-slate-400" />
              <span>{node.path}</span>
            </div>
          )}
        </div>

        {/* Documents at this node */}
        {node.documents.length > 0 && (
          <div className="ml-7 pl-4 border-l border-slate-200 dark:border-slate-700">
            {node.documents.map((doc) => (
              <button
                key={doc.legacyId}
                onClick={() => onSelectDocument(doc)}
                className="w-full text-left py-1.5 pl-2 pr-2 text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center"
              >
                <File className="h-4 w-4 mr-2 text-slate-400" />
                <span className="truncate">
                  {doc.title} ({doc.revision})
                </span>

                {doc.alertStatus === "expired" && (
                  <AlertCircle className="ml-2 h-4 w-4 text-red-500" />
                )}
                {doc.alertStatus === "warning" && (
                  <AlertTriangle className="ml-2 h-4 w-4 text-amber-500" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Children nodes */}
        {hasChildren && isExpanded && (
          <div className="ml-6 space-y-1">
            {node.children.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  const tree = useMemo(() => {
    const root: TreeNode = {
      id: "root",
      name: "Tutti i documenti",
      level: 0,
      children: [],
      documents: [],
      hasWarning: false,
      hasError: false,
    };

    const docs = documents.filter((doc) => doc.path);

    docs.forEach((doc) => {
      const parts = doc.path.split("/").filter(Boolean);
      let currentNode = root;

      parts.forEach((part, index) => {
        const pathId = parts.slice(0, index + 1).join("/");

        let childNode = currentNode.children.find((child) => child.id === pathId);

        if (!childNode) {
          childNode = {
            id: pathId,
            name: part,
            level: index + 1,
            children: [],
            documents: [],
            hasWarning: false,
            hasError: false,
          };
          currentNode.children.push(childNode);
        }

        
        if (index === parts.length - 1) {
          childNode.children.push({
            id: String(doc.legacyId),
            name: doc.title,
            level: index + 2,
            children: [],
            documents: [doc],
            hasWarning: doc.alertStatus === "warning",
            hasError: doc.alertStatus === "expired",
          });
        }
        currentNode = childNode;
      });
    });
    return [root];
  }, [documents]);

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="p-2">{renderNode(tree)}</div>
    </ScrollArea>
  );
}
