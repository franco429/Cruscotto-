import { mongoStorage } from "../mongo-storage";

async function fixObsoleteRevisions() {
  const allDocs = await mongoStorage.getAllDocumentsRaw();
  const grouped = new Map<string, any[]>();

  // Raggruppa per clientId+path+title
  for (const doc of allDocs) {
    const key = `${doc.clientId}__${doc.path}__${doc.title}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(doc);
  }

  for (const docs of grouped.values()) {
    if (docs.length <= 1) continue;
    // Trova la revisione più alta
    const sorted = docs.sort((a, b) => {
      const revA = parseInt(a.revision.replace("Rev.", ""), 10);
      const revB = parseInt(b.revision.replace("Rev.", ""), 10);
      return revB - revA;
    });
    const latest = sorted[0];
    for (const doc of sorted.slice(1)) {
      if (!doc.isObsolete) {
        await mongoStorage.markDocumentObsolete(doc.legacyId);
        console.log(
          `Marked obsolete: ${doc.title} ${doc.revision} (clientId: ${doc.clientId})`
        );
      }
    }
  }
  console.log("Obsolete fix completed.");
}

fixObsoleteRevisions().then(() => process.exit(0));
