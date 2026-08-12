import { TableClient, odata } from "@azure/data-tables";
import { ProcessSubmission } from "../types/domain";

const TABLE_NAME = "ProcessSubmissions";
const PARTITION_KEY = "submission";

let cachedClient: TableClient | null = null;

async function getClient(): Promise<TableClient> {
  if (cachedClient) return cachedClient;
  const connectionString = process.env.TABLE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("TABLE_STORAGE_CONNECTION_STRING is not set");
  }
  const client = TableClient.fromConnectionString(connectionString, TABLE_NAME);
  await client.createTable();
  cachedClient = client;
  return client;
}

// RowKey sorts newest-first: a fixed-width reverse timestamp.
function toRowKey(submittedAt: string): string {
  const ticks = new Date(submittedAt).getTime();
  const reversed = Number.MAX_SAFE_INTEGER - ticks;
  return String(reversed).padStart(16, "0");
}

interface StoredEntity {
  partitionKey: string;
  rowKey: string;
  id: string;
  submittedAt: string;
  status: string;
  intakeJson: string;
  conversationJson: string;
  recommendationJson: string;
  pendingQuestionsJson: string;
}

function toEntity(submission: ProcessSubmission): StoredEntity {
  return {
    partitionKey: PARTITION_KEY,
    rowKey: toRowKey(submission.submittedAt),
    id: submission.id,
    submittedAt: submission.submittedAt,
    status: submission.status,
    intakeJson: JSON.stringify(submission.intake),
    conversationJson: JSON.stringify(submission.conversation),
    recommendationJson: JSON.stringify(submission.recommendation),
    pendingQuestionsJson: JSON.stringify(submission.pendingQuestions),
  };
}

function fromEntity(entity: StoredEntity): ProcessSubmission {
  return {
    id: entity.id,
    submittedAt: entity.submittedAt,
    status: entity.status as ProcessSubmission["status"],
    intake: JSON.parse(entity.intakeJson),
    conversation: JSON.parse(entity.conversationJson),
    recommendation: JSON.parse(entity.recommendationJson),
    pendingQuestions: JSON.parse(entity.pendingQuestionsJson),
  };
}

export async function upsertSubmission(submission: ProcessSubmission): Promise<void> {
  const client = await getClient();
  await client.upsertEntity(toEntity(submission), "Replace");
}

export async function getSubmissionById(id: string): Promise<ProcessSubmission | null> {
  const client = await getClient();
  const entities = client.listEntities<StoredEntity>({
    queryOptions: { filter: odata`PartitionKey eq ${PARTITION_KEY} and id eq ${id}` },
  });
  for await (const entity of entities) {
    return fromEntity(entity);
  }
  return null;
}

export async function listSubmissions(): Promise<ProcessSubmission[]> {
  const client = await getClient();
  const entities = client.listEntities<StoredEntity>({
    queryOptions: { filter: odata`PartitionKey eq ${PARTITION_KEY}` },
  });
  const results: ProcessSubmission[] = [];
  for await (const entity of entities) {
    results.push(fromEntity(entity));
  }
  // RowKey is already reverse-chronological, but sort defensively since
  // Table Storage's listing order isn't a strict contract.
  results.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  return results;
}
