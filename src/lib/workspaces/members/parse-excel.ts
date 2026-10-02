import "server-only";

import ExcelJS from "exceljs";
import { and, asc, eq, ne } from "drizzle-orm";

import { getServerEnv } from "@/config/env";
import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { directoryOption } from "@/db/schema/directory";
import { workspaceMember } from "@/db/schema/workspaces";
import type {
  WorkspaceImportItemPayload,
  WorkspaceImportItemValidation,
} from "@/db/schema/workspaces";
import { isAllowedInstitutionalEmail } from "@/lib/auth/permissions";

export type ParsedImportRow = {
  rowIndex: number;
  payload: WorkspaceImportItemPayload;
  validation: WorkspaceImportItemValidation;
  resolvedUserId: string | null;
};

type DirectoryOptionItem = { value: string; label: string };

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && value !== null && "text" in value) {
    return String((value as { text: string }).text ?? "").trim();
  }
  if (typeof value === "number") return String(value);
  return String(value).trim();
}

async function loadActiveDirectoryOptions(
  category: "major" | "batch",
): Promise<DirectoryOptionItem[]> {
  const rows = await db
    .select({
      value: directoryOption.value,
      label: directoryOption.label,
    })
    .from(directoryOption)
    .where(
      and(
        eq(directoryOption.category, category),
        eq(directoryOption.isActive, true),
      ),
    )
    .orderBy(asc(directoryOption.sortOrder), asc(directoryOption.label));

  return rows;
}

export async function loadActiveMajorOptions(): Promise<DirectoryOptionItem[]> {
  return loadActiveDirectoryOptions("major");
}

export async function loadActiveBatchOptions(): Promise<DirectoryOptionItem[]> {
  return loadActiveDirectoryOptions("batch");
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0F172A" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  name: "Calibri",
  size: 11,
};
const ACCENT_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF38BDF8" },
};
const ZEBRA_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF8FAFC" },
};
const EXAMPLE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFEF3C7" },
};
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
};

function applyListValidation(
  cell: ExcelJS.Cell,
  rangeFormula: string,
  title: string,
  prompt: string,
  error: string,
) {
  cell.dataValidation = {
    type: "list",
    allowBlank: true,
    formulae: [rangeFormula],
    showErrorMessage: true,
    showInputMessage: true,
    promptTitle: title,
    prompt,
    errorTitle: `Invalid ${title.toLowerCase()}`,
    error,
  };
}

export async function buildMembersTemplateBuffer(): Promise<Buffer> {
  const [majors, batches] = await Promise.all([
    loadActiveMajorOptions(),
    loadActiveBatchOptions(),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "inkcuba";
  workbook.created = new Date();
  workbook.lastModifiedBy = "inkcuba";
  workbook.description =
    "Student import template. Academic Program and Batch sync from Directory Options.";

  const lists = workbook.addWorksheet("Lists", { state: "hidden" });
  lists.getCell("A1").value = "Academic Program";
  lists.getCell("B1").value = "Batch";
  majors.forEach((m, i) => {
    lists.getCell(i + 2, 1).value = m.label;
  });
  batches.forEach((b, i) => {
    lists.getCell(i + 2, 2).value = b.label;
  });
  const majorRange =
    majors.length > 0 ? `Lists!$A$2:$A$${majors.length + 1}` : null;
  const batchRange =
    batches.length > 0 ? `Lists!$B$2:$B$${batches.length + 1}` : null;

  const sheet = workbook.addWorksheet("Students", {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { defaultRowHeight: 22 },
  });

  sheet.columns = [
    { header: "Student Name", key: "name", width: 34 },
    { header: "Student ID / NIM", key: "nim", width: 20 },
    { header: "Student Email", key: "email", width: 36 },
    { header: "Academic Program", key: "major", width: 32 },
    { header: "Batch", key: "batch", width: 16 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = THIN_BORDER;
  });

  const example = sheet.getRow(2);
  example.values = [
    "Example Student (replace me)",
    "BN251000001",
    "example.student@binus.ac.id",
    majors[0]?.label ?? "Computer Science",
    batches[0]?.label ?? "2028",
  ];
  example.height = 22;
  example.eachCell((cell) => {
    cell.fill = EXAMPLE_FILL;
    cell.font = {
      name: "Calibri",
      size: 11,
      italic: true,
      color: { argb: "FF92400E" },
    };
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: "middle" };
  });
  sheet.getCell("A2").note =
    "Sample row — replace with real student data or delete before uploading.";

  for (let row = 2; row <= 202; row += 1) {
    const excelRow = sheet.getRow(row);
    if (row > 2) excelRow.height = 20;
    for (let col = 1; col <= 5; col += 1) {
      const cell = excelRow.getCell(col);
      cell.border = THIN_BORDER;
      if (row > 2 && row % 2 === 0) cell.fill = ZEBRA_FILL;
      cell.alignment = { vertical: "middle" };
    }
    if (majorRange) {
      applyListValidation(
        sheet.getCell(`D${row}`),
        majorRange,
        "Academic Program",
        "Select a major from Directory Options.",
        "Please select an Academic Program from the dropdown list.",
      );
    }
    if (batchRange) {
      applyListValidation(
        sheet.getCell(`E${row}`),
        batchRange,
        "Batch",
        "Select a batch from Directory Options.",
        "Please select a Batch from the dropdown list.",
      );
    }
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 202, column: 5 },
  };

  const instructions = workbook.addWorksheet("Instructions", {
    properties: { defaultRowHeight: 20 },
  });
  instructions.getColumn(1).width = 96;

  instructions.getRow(1).values = ["inkcuba — Student import template"];
  instructions.getRow(1).font = {
    bold: true,
    size: 16,
    color: { argb: "FF0F172A" },
    name: "Calibri",
  };
  instructions.getRow(1).height = 28;
  instructions.getRow(2).values = [
    "Columns match the People table. Upload from Workspace → People → Import Excel.",
  ];
  instructions.getRow(2).font = {
    size: 11,
    color: { argb: "FF475569" },
    name: "Calibri",
  };

  const steps: Array<[string, string]> = [
    [
      "Columns",
      "Student Name · Student ID / NIM · Student Email · Academic Program · Batch.",
    ],
    [
      "Student ID / NIM",
      "Alphanumeric, 5–20 characters (NIM or BINUSIAN ID). Required.",
    ],
    [
      "Student Email",
      "Must be @binus.ac.id or @binus.edu. Existing accounts are invited; new emails get activation links.",
    ],
    [
      "Academic Program",
      "Dropdown synced from Admin → Directory Options → majors. Exact label required.",
    ],
    [
      "Batch",
      "Dropdown synced from Admin → Directory Options → batch. Exact label required.",
    ],
    [
      "Example row",
      "Row 2 is a sample. Replace or delete it before uploading real data.",
    ],
    [
      "Workflow",
      "1) Fill rows → 2) Upload → 3) Fix preview warnings → 4) Commit (background queue).",
    ],
  ];

  let rowIndex = 4;
  for (const [heading, body] of steps) {
    const head = instructions.getRow(rowIndex);
    head.values = [heading];
    head.font = {
      bold: true,
      size: 12,
      color: { argb: "FF0369A1" },
      name: "Calibri",
    };
    head.fill = ACCENT_FILL;
    head.height = 22;
    rowIndex += 1;
    const bodyRow = instructions.getRow(rowIndex);
    bodyRow.values = [body];
    bodyRow.font = { size: 11, name: "Calibri", color: { argb: "FF334155" } };
    bodyRow.alignment = { wrapText: true, vertical: "top" };
    bodyRow.height = 36;
    rowIndex += 2;
  }

  function addReferenceSheet(
    titleText: string,
    headerLabel: string,
    items: DirectoryOptionItem[],
  ) {
    if (items.length === 0) return;
    const ref = workbook.addWorksheet(titleText, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ref.columns = [
      { header: "#", key: "n", width: 6 },
      { header: headerLabel, key: "label", width: 48 },
    ];
    const head = ref.getRow(1);
    head.height = 24;
    head.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = THIN_BORDER;
    });
    items.forEach((item, index) => {
      const r = ref.getRow(index + 2);
      r.values = [index + 1, item.label];
      r.eachCell((cell) => {
        cell.border = THIN_BORDER;
        if (index % 2 === 1) cell.fill = ZEBRA_FILL;
      });
    });
  }

  addReferenceSheet(
    "Majors (reference)",
    "Academic Program (use exact label)",
    majors,
  );
  addReferenceSheet("Batches (reference)", "Batch (use exact label)", batches);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function validateDirectoryLabel(
  label: string,
  options: DirectoryOptionItem[],
  fieldName: string,
): { match: DirectoryOptionItem | undefined; errors: string[] } {
  const errors: string[] = [];
  const byLabel = new Map(
    options.map((o) => [o.label.trim().toLowerCase(), o]),
  );
  const match = byLabel.get(label.trim().toLowerCase());
  if (!label.trim()) {
    errors.push(`${fieldName} is required`);
  } else if (!match) {
    errors.push(
      `${fieldName} must match a Directory Options label`,
    );
  }
  return { match, errors };
}

export async function parseMembersExcelBuffer(
  buffer: Buffer,
  workspaceId: string,
): Promise<ParsedImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet =
    workbook.getWorksheet("Students") ?? workbook.worksheets[0];
  if (!sheet) {
    throw new Error("Excel file has no worksheet");
  }

  const [majors, batches] = await Promise.all([
    loadActiveMajorOptions(),
    loadActiveBatchOptions(),
  ]);

  const headerRow = sheet.getRow(1);
  const headers: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const key = normalizeHeader(cell.value);
    if (key) headers[key] = colNumber;
  });

  const nameCol =
    headers["student name"] ?? headers["name"] ?? headers["nama"];
  const codeCol =
    headers["student id / nim"] ??
    headers["student id"] ??
    headers["student code"] ??
    headers["nim"] ??
    headers["binusian id"];
  const emailCol =
    headers["student email"] ?? headers["email"] ?? headers["e-mail"];
  const majorCol =
    headers["academic program"] ??
    headers["major"] ??
    headers["program"];
  const batchCol = headers["batch"] ?? headers["angkatan"];

  if (!nameCol || !codeCol || !emailCol || !majorCol || !batchCol) {
    throw new Error(
      "Missing required columns. Expected: Student Name, Student ID / NIM, Student Email, Academic Program, Batch",
    );
  }

  const existingMembers = await db
    .select({
      userId: workspaceMember.userId,
      email: userTable.email,
      nim: userTable.nim,
    })
    .from(workspaceMember)
    .innerJoin(userTable, eq(workspaceMember.userId, userTable.id))
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        ne(workspaceMember.status, "REMOVED"),
      ),
    );

  const memberEmails = new Set(
    existingMembers.map((m) => m.email.toLowerCase()),
  );
  const memberNims = new Set(
    existingMembers
      .map((m) => m.nim?.toLowerCase())
      .filter((v): v is string => Boolean(v)),
  );

  const allUsers = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      nim: userTable.nim,
    })
    .from(userTable)
    .where(eq(userTable.role, "STUDENT"));

  const userByEmail = new Map(
    allUsers.map((u) => [u.email.toLowerCase(), u]),
  );
  const userByNim = new Map(
    allUsers
      .filter((u) => u.nim)
      .map((u) => [u.nim!.toLowerCase(), u]),
  );

  const seenEmails = new Set<string>();
  const seenNims = new Set<string>();
  const parsed: ParsedImportRow[] = [];
  const maxRows = getServerEnv().WORKSPACE_IMPORT_MAX_ROWS;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (parsed.length >= maxRows) return;

    const name = cellText(row.getCell(nameCol).value);
    const nim = cellText(row.getCell(codeCol).value);
    const email = cellText(row.getCell(emailCol).value).toLowerCase();
    const majorLabel = cellText(row.getCell(majorCol).value);
    const batchLabel = cellText(row.getCell(batchCol).value);

    if (!name && !nim && !email && !majorLabel && !batchLabel) return;

    if (
      name.toLowerCase().includes("example student") ||
      email === "example.student@binus.ac.id"
    ) {
      return;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!name || name.length < 2) {
      errors.push("Student Name is required");
    }
    if (!/^[a-zA-Z0-9]{5,20}$/.test(nim)) {
      errors.push("Student ID / NIM must be 5–20 alphanumeric characters");
    }
    if (!email || !isAllowedInstitutionalEmail(email)) {
      errors.push("Student Email must be @binus.ac.id or @binus.edu");
    }

    const majorResult = validateDirectoryLabel(
      majorLabel,
      majors,
      "Academic Program",
    );
    const batchResult = validateDirectoryLabel(batchLabel, batches, "Batch");
    errors.push(...majorResult.errors, ...batchResult.errors);

    if (email && seenEmails.has(email)) {
      errors.push("Duplicate email in this file");
    }
    if (nim && seenNims.has(nim.toLowerCase())) {
      errors.push("Duplicate Student ID / NIM in this file");
    }
    if (email) seenEmails.add(email);
    if (nim) seenNims.add(nim.toLowerCase());

    const existingUser =
      userByEmail.get(email) ??
      (nim ? userByNim.get(nim.toLowerCase()) : undefined);

    let matchType: WorkspaceImportItemValidation["matchType"] = "NEW_USER";
    if (errors.length > 0) {
      matchType = "INVALID";
    } else if (
      existingUser &&
      (memberEmails.has(existingUser.email.toLowerCase()) ||
        (existingUser.nim && memberNims.has(existingUser.nim.toLowerCase())))
    ) {
      matchType = "ALREADY_MEMBER";
      warnings.push("Already a member of this workspace");
    } else if (existingUser) {
      matchType = "EXISTING_USER";
    }

    parsed.push({
      rowIndex: rowNumber,
      payload: {
        name,
        nim,
        email,
        majorLabel,
        majorValue: majorResult.match?.value ?? null,
        batchLabel,
        batchValue: batchResult.match?.value ?? null,
      },
      validation: { errors, warnings, matchType },
      resolvedUserId: existingUser?.id ?? null,
    });
  });

  return parsed;
}

export function revalidateImportItem(
  payload: WorkspaceImportItemPayload,
  majors: DirectoryOptionItem[],
  batches: DirectoryOptionItem[],
  context: {
    seenEmails: Set<string>;
    seenNims: Set<string>;
    memberEmails: Set<string>;
    memberNims: Set<string>;
    userByEmail: Map<string, { id: string; email: string; nim: string | null }>;
    userByNim: Map<string, { id: string; email: string; nim: string | null }>;
  },
): WorkspaceImportItemValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!payload.name || payload.name.trim().length < 2) {
    errors.push("Student Name is required");
  }
  if (!/^[a-zA-Z0-9]{5,20}$/.test(payload.nim)) {
    errors.push("Student ID / NIM must be 5–20 alphanumeric characters");
  }

  errors.push(
    ...validateDirectoryLabel(
      payload.majorLabel ?? "",
      majors,
      "Academic Program",
    ).errors,
  );
  errors.push(
    ...validateDirectoryLabel(payload.batchLabel ?? "", batches, "Batch")
      .errors,
  );

  const email = payload.email.toLowerCase();
  const nim = payload.nim.toLowerCase();

  if (!email || !isAllowedInstitutionalEmail(email)) {
    errors.push("Student Email must be @binus.ac.id or @binus.edu");
  }

  if (context.seenEmails.has(email) || context.seenNims.has(nim)) {
    errors.push("Duplicate email or Student ID / NIM in this import");
  }

  const existingUser =
    context.userByEmail.get(email) ?? context.userByNim.get(nim);

  let matchType: WorkspaceImportItemValidation["matchType"] = "NEW_USER";
  if (errors.length > 0) {
    matchType = "INVALID";
  } else if (
    existingUser &&
    (context.memberEmails.has(existingUser.email.toLowerCase()) ||
      (existingUser.nim &&
        context.memberNims.has(existingUser.nim.toLowerCase())))
  ) {
    matchType = "ALREADY_MEMBER";
    warnings.push("Already a member of this workspace");
  } else if (existingUser) {
    matchType = "EXISTING_USER";
  }

  return { errors, warnings, matchType };
}
