import type { CandidateQuestion } from "../../src/coach/question-schema.ts";

export const mcFixture: CandidateQuestion = {
	skillId: "identity.external-users",
	body: {
		format: "multiple-choice",
		stem: "You have a Microsoft Entra tenant named fabrikam.example. The tenant contains the user accounts shown in the exhibit. You need to identify the account that was created by inviting an external partner using an email address from another organization. Which account should you select?",
		exhibit: {
			kind: "table",
			columns: ["Display name", "UserPrincipalName", "Job title"],
			rows: [
				["Nia Okoro", "nia@fabrikam.example", "Network engineer"],
				["Tomas Berg", "tomas_adatum.example#EXT#@fabrikam.example", "Consultant"],
				["Priya Rao", "priya@fabrikam.example", "Finance analyst"],
				["Sam Lund", "sam.lund@fabrikam.example", "Support lead"],
			],
		},
		options: [
			{ id: "a", text: "Nia Okoro" },
			{ id: "b", text: "Tomas Berg" },
			{ id: "c", text: "Priya Rao" },
			{ id: "d", text: "Sam Lund" },
		],
	},
	key: { optionId: "b" },
	explanation: {
		correct:
			"Guest accounts created through an invitation get a UserPrincipalName that embeds the original address and ends with #EXT# plus the tenant domain. Only Tomas Berg matches.",
		perChoice: {
			a: "The UPN uses the tenant domain with no #EXT# marker, so this is a member account.",
			c: "The UPN uses the tenant domain with no #EXT# marker, so this is a member account.",
			d: "The UPN uses the tenant domain with no #EXT# marker, so this is a member account.",
		},
	},
	sources: [{ url: "https://learn.microsoft.com/entra/external-id/what-is-b2b" }],
	subtopics: ["guest-users", "b2b-invitations"],
};
export const mcCorrect = { optionId: "b" };

export const dragDropFixture: CandidateQuestion = {
	skillId: "access.role-scopes",
	body: {
		format: "drag-drop",
		stem: "You manage an Azure environment with a management group named mg-prod that contains several subscriptions. You need to assign Azure roles at the narrowest scope that meets each requirement. Which scope should you use for each requirement? To answer, drag the appropriate scope to each requirement.",
		items: [
			{ id: "mg", text: "Management group mg-prod" },
			{ id: "sub", text: "Subscription sub-web" },
			{ id: "rg", text: "Resource group rg-web" },
			{ id: "res", text: "Virtual machine vm-app01" },
		],
		slots: [
			{ id: "s1", label: "Grant Reader on every subscription in the production hierarchy" },
			{ id: "s2", label: "Grant Contributor on everything that belongs to the web workload only" },
			{ id: "s3", label: "Let a support engineer restart a single server only" },
		],
	},
	key: { s1: "mg", s2: "rg", s3: "res" },
	explanation: {
		correct:
			"Role assignments inherit downward, so the management group covers all child subscriptions, the resource group covers only its resources, and the virtual machine scope covers one resource.",
		perChoice: {
			mg: "Correct for the first requirement, because child subscriptions inherit the assignment. Too broad for the others.",
			sub: "Not the narrowest scope for any requirement: it covers every resource group in sub-web and does not reach other subscriptions.",
			rg: "Correct for the second requirement, because it limits access to rg-web. Too broad for a single virtual machine.",
			res: "Correct for the third requirement, because the scope is one resource. Too narrow for the others.",
		},
	},
	sources: [{ url: "https://learn.microsoft.com/azure/role-based-access-control/scope-overview" }],
	subtopics: ["role-assignment-scope", "scope-inheritance"],
};
export const dragDropCorrect = { s1: "mg", s2: "rg", s3: "res" };

export const completeSentenceFixture: CandidateQuestion = {
	skillId: "identity.sspr",
	body: {
		format: "complete-sentence",
		stem: "Your on-premises Active Directory domain is synchronized to Microsoft Entra ID. You plan a pilot that lets one group of users reset their own passwords, and each reset must also take effect on-premises. How should you configure the solution?",
		statement:
			"Enable {{s1}} in Microsoft Entra Connect, and set the self-service password reset scope to {{s2}}.",
		slots: [
			{
				id: "s1",
				options: [
					{ id: "a", text: "password writeback" },
					{ id: "b", text: "password hash synchronization" },
					{ id: "c", text: "pass-through authentication" },
				],
			},
			{
				id: "s2",
				options: [
					{ id: "a", text: "All" },
					{ id: "b", text: "Selected" },
					{ id: "c", text: "None" },
				],
			},
		],
	},
	key: { s1: "a", s2: "b" },
	explanation: {
		correct:
			"Password writeback sends cloud password changes back to on-premises Active Directory, and the Selected scope limits self-service reset to the pilot group.",
		perChoice: {
			"s1:b": "Password hash synchronization copies on-premises password hashes to the cloud; it does not write cloud resets back.",
			"s1:c": "Pass-through authentication validates sign-ins on-premises; it does not write cloud resets back.",
			"s2:a": "All would enable reset for every user, not only the pilot group.",
			"s2:c": "None disables self-service password reset for everyone.",
		},
	},
	sources: [{ url: "https://learn.microsoft.com/entra/identity/authentication/concept-sspr-writeback" }],
	subtopics: ["sspr-writeback", "sspr-scope"],
};
export const completeSentenceCorrect = { s1: "a", s2: "b" };
