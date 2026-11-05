import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openCoachDb } from "../../src/coach/db.ts";
import { areaName, areaOfSkill, SPECIALISTS } from "../../src/coach/exam/instructors.ts";
import { skillProgress } from "../../src/coach/progress.ts";
import { SKILLS } from "../../src/coach/exam/seed.ts";

describe("seeding areas", () => {
	it("seeds the 17 storage skills in the storage area with positions 1 to 17", () => {
		const db = openCoachDb(":memory:");
		const rows = db.raw.prepare("SELECT id, specialist, position FROM skills WHERE area_id = 'storage' ORDER BY position").all();
		expect(rows).toHaveLength(17);
		expect({ ...rows[0] }).toEqual({ id: "storage.firewalls", specialist: "storage-security", position: 1 });
		expect({ ...rows.at(-1) }).toEqual({ id: "storage.versioning", specialist: "files-blobs", position: 17 });
	});

	it("keeps the 15 identity and governance skills at positions 1 to 15", () => {
		const db = openCoachDb(":memory:");
		const rows = db.raw
			.prepare("SELECT id, position FROM skills WHERE area_id = 'identity-governance' ORDER BY position")
			.all() as { id: string; position: number }[];
		expect(rows.map((r) => r.position)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
		expect(rows[0].id).toBe("identity.create-users-groups");
		expect(rows.at(-1)?.id).toBe("governance.management-groups");
	});

	it("seeds the 24 compute skills across its four instructors", () => {
		const db = openCoachDb(":memory:");
		const rows = db.raw
			.prepare("SELECT specialist, COUNT(*) AS n FROM skills WHERE area_id = 'compute' GROUP BY specialist ORDER BY MIN(position)")
			.all()
			.map((r) => ({ ...r }));
		expect(rows).toEqual([
			{ specialist: "templates", n: 5 },
			{ specialist: "virtual-machines", n: 7 },
			{ specialist: "containers", n: 4 },
			{ specialist: "app-service", n: 8 },
		]);
		expect(areaOfSkill("compute.vmss")).toBe("compute");
	});

	it("seeds the 13 monitoring skills across its two instructors", () => {
		const db = openCoachDb(":memory:");
		const rows = db.raw
			.prepare("SELECT specialist, COUNT(*) AS n FROM skills WHERE area_id = 'monitoring' GROUP BY specialist ORDER BY MIN(position)")
			.all()
			.map((r) => ({ ...r }));
		expect(rows).toEqual([
			{ specialist: "azure-monitor", n: 6 },
			{ specialist: "backup-recovery", n: 7 },
		]);
		expect(areaOfSkill("monitoring.site-recovery")).toBe("monitoring");
	});

	it("seeds the 13 networking skills across its three instructors", () => {
		const db = openCoachDb(":memory:");
		const rows = db.raw
			.prepare("SELECT specialist, COUNT(*) AS n FROM skills WHERE area_id = 'networking' GROUP BY specialist ORDER BY MIN(position)")
			.all()
			.map((r) => ({ ...r }));
		expect(rows).toEqual([
			{ specialist: "virtual-networks", n: 5 },
			{ specialist: "network-security", n: 5 },
			{ specialist: "dns-load-balancing", n: 3 },
		]);
		expect(areaOfSkill("networking.bastion")).toBe("networking");
	});

	it("maps every skill to its specialist's area", () => {
		expect(areaOfSkill("storage.sas-tokens")).toBe("storage");
		expect(areaOfSkill("governance.locks")).toBe("identity-governance");
		expect(() => areaOfSkill("nope")).toThrow(/Unknown skill/);
		for (const [, specialist] of SKILLS) expect(SPECIALISTS.some((s) => s.id === specialist)).toBe(true);
		expect(areaName("storage")).toBe("Implement and manage storage");
	});

	it("leaves an existing database's rows untouched when reopened", () => {
		const path = join(mkdtempSync(join(tmpdir(), "seed-")), "coach.db");
		const first = openCoachDb(path, { questionBank: false });
		first.raw.prepare("UPDATE skills SET name = 'kept' WHERE id = 'identity.sspr'").run();
		first.raw.close();
		const again = openCoachDb(path, { questionBank: false });
		expect((again.raw.prepare("SELECT name FROM skills WHERE id = 'identity.sspr'").get() as { name: string }).name).toBe("kept");
		expect((again.raw.prepare("SELECT COUNT(*) AS n FROM skills").get() as { n: number }).n).toBe(82);
	});

	it("orders skills by area, then position", () => {
		const ids = skillProgress(openCoachDb(":memory:")).map((s) => s.id);
		expect(ids).toHaveLength(82);
		expect(ids.indexOf("governance.management-groups")).toBeLessThan(ids.indexOf("storage.firewalls"));
		expect(ids.indexOf("storage.firewalls")).toBe(15);
	});
});
