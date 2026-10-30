import { describe, expect, it } from "vitest";
import { findLeak, stem } from "../../src/coach/questions/leak.ts";
import type { CandidateQuestion } from "../../src/coach/questions/question-schema.ts";
import { completeSentenceFixture, dragDropFixture, mcFixture } from "./fixtures.ts";

function mc(stemText: string, options: string[], keyIndex: number, exhibit?: CandidateQuestion["body"]["exhibit"]) {
	const ids = ["a", "b", "c", "d"];
	return {
		...mcFixture,
		body: {
			format: "multiple-choice",
			stem: stemText,
			...(exhibit ? { exhibit } : {}),
			options: options.map((text, i) => ({ id: ids[i], text })),
		},
		key: { optionId: ids[keyIndex] },
	} as CandidateQuestion;
}

describe("stem", () => {
	it("folds invite, invitation and Inviter together", () => {
		expect(new Set(["invite", "invitation", "Inviter", "invitations", "invited"].map(stem)).size).toBe(1);
	});
});

describe("findLeak: multiple choice", () => {
	it("catches a Guest exhibit filter when only the key says Guest", () => {
		const q = mc(
			"You invited a partner contact to your tenant. You need to identify the account type of the invited account. Which userType value should you look for?",
			["Member", "Guest", "Internal", "Contractor"],
			1,
			{ kind: "code", language: "powershell", text: `Get-MgUser -Filter "userType eq 'Guest'" -All` },
		);
		expect(findLeak(q)).toEqual(["Guest"]);
	});

	it('catches "sign themselves up" against "self-service sign up"', () => {
		const q = mc(
			"You administer a Microsoft Entra workforce tenant. You want external users to be able to sign themselves up for a new application without an invitation. You need to build this sign-up experience. Which setting should you configure?",
			[
				"Guest user access restrictions on the External collaboration settings page",
				"Guest invite settings on the External collaboration settings page",
				"Enable guest self-service sign up via user flows on the External collaboration settings page",
				"External user leave settings on the External collaboration settings page",
			],
			2,
		);
		expect(findLeak(q)).toContain("sign");
	});

	it('catches "invite" wording against the key "Guest Inviter"', () => {
		const q = mc(
			"A non-admin member must be able to invite external partners on an ongoing basis. You need to grant the least-privileged role that provides this invite capability. Which role should you assign?",
			["Guest Inviter", "User Administrator", "Privileged Authentication Administrator", "Application Administrator"],
			0,
		);
		expect(findLeak(q)).toEqual(["invite"]);
	});

	it("passes when the key's distinguishing words stay out of the stem", () => {
		const q = mc(
			"You administer a Microsoft Entra tenant hosted in Microsoft Azure Government. Vendors whose organizations use tenants in the Azure global cloud must be invited as guest users. You need to set up B2B collaboration between the two clouds. Which task must be completed first?",
			[
				"Configure Microsoft cloud settings in both tenants to enable collaboration with the other cloud.",
				"Add each partner's verified domain to the allow list in the resource tenant's external collaboration settings.",
				"Configure B2B direct connect between the agency's tenant and each partner tenant.",
				"Migrate the agency's tenant from Microsoft Azure Government to the Azure global cloud.",
			],
			0,
		);
		expect(findLeak(q)).toBeNull();
	});

	it("passes an exhibit that lists every option alike", () => {
		expect(findLeak(mcFixture)).toBeNull();
	});
});

describe("findLeak: complete sentence", () => {
	it("passes a statement that does not echo the keyed option", () => {
		expect(findLeak(completeSentenceFixture)).toBeNull();
	});

	it("catches a statement that echoes the keyed option", () => {
		const q = {
			...completeSentenceFixture,
			body: { ...completeSentenceFixture.body, statement: "Enable {{s1}} for the writeback of resets, and set the scope to {{s2}}." },
		} as CandidateQuestion;
		expect(findLeak(q)).toEqual(["writeback"]);
	});
});

describe("findLeak: drag-drop", () => {
	it("passes labels that do not name their keyed item", () => {
		expect(findLeak(dragDropFixture)).toBeNull();
	});

	it("catches a label that names its keyed item", () => {
		const body = dragDropFixture.body as Extract<CandidateQuestion["body"], { format: "drag-drop" }>;
		const q = {
			...dragDropFixture,
			body: {
				...body,
				slots: body.slots.map((s) => (s.id === "s3" ? { ...s, label: "Grant access to vm-app01 only" } : s)),
			},
		} as CandidateQuestion;
		expect(findLeak(q)).toEqual(["vm", "app01"]);
	});
});
