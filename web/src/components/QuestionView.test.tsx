// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicQuestion } from "../lib/types.ts";
import { QuestionView } from "./QuestionView.tsx";

afterEach(cleanup);

const mc: PublicQuestion = {
	id: "q1",
	skillId: "s",
	format: "multiple-choice",
	body: {
		format: "multiple-choice",
		stem: "Which role?",
		options: [
			{ id: "a", text: "Reader" },
			{ id: "b", text: "Owner" },
			{ id: "c", text: "Contributor" },
			{ id: "d", text: "Billing" },
		],
	},
};
const dd: PublicQuestion = {
	id: "q2",
	skillId: "s",
	format: "drag-drop",
	body: {
		format: "drag-drop",
		stem: "Order them",
		items: [
			{ id: "i1", text: "Tenant" },
			{ id: "i2", text: "Subscription" },
		],
		slots: [
			{ id: "top", label: "Top" },
			{ id: "bottom", label: "Bottom" },
		],
	},
};
const cs: PublicQuestion = {
	id: "q3",
	skillId: "s",
	format: "complete-sentence",
	body: {
		format: "complete-sentence",
		stem: "Fill in",
		statement: "A {{s1}} holds {{s2}}.",
		slots: [
			{
				id: "s1",
				options: [
					{ id: "a", text: "group" },
					{ id: "b", text: "user" },
				],
			},
			{
				id: "s2",
				options: [
					{ id: "c", text: "members" },
					{ id: "d", text: "locks" },
				],
			},
		],
	},
};

const check = () => screen.getByRole("button", { name: /check your answer/i }) as HTMLButtonElement;

describe("QuestionView", () => {
	it("multiple choice: submit is disabled until a choice, then sends optionId", () => {
		const onSubmit = vi.fn();
		render(<QuestionView question={mc} onSubmit={onSubmit} />);
		expect(check().disabled).toBe(true);
		fireEvent.click(screen.getByLabelText("Owner"));
		expect(check().disabled).toBe(false);
		fireEvent.click(check());
		expect(onSubmit).toHaveBeenCalledWith({ optionId: "b" });
	});

	it("drag-drop: keyboard select item then slot places it, and an item can be removed", () => {
		const onSubmit = vi.fn();
		render(<QuestionView question={dd} onSubmit={onSubmit} />);
		const pick = (item: string, slot: string) => {
			const i = screen.getByRole("button", { name: new RegExp(`^item ${item}`, "i") });
			i.focus();
			fireEvent.keyDown(i, { key: "Enter" });
			const s = screen.getByRole("button", { name: new RegExp(`^slot ${slot}`, "i") });
			s.focus();
			fireEvent.keyDown(s, { key: "Enter" });
		};
		pick("Tenant", "Top");
		expect(check().disabled).toBe(true);
		fireEvent.click(screen.getByRole("button", { name: /remove tenant/i }));
		pick("Tenant", "Top");
		pick("Subscription", "Bottom");
		expect(check().disabled).toBe(false);
		fireEvent.click(check());
		expect(onSubmit).toHaveBeenCalledWith({ top: "i1", bottom: "i2" });
	});

	it("complete-sentence: both dropdowns enable submit and send the slot map", () => {
		const onSubmit = vi.fn();
		render(<QuestionView question={cs} onSubmit={onSubmit} />);
		const [first, second] = screen.getAllByRole("combobox");
		fireEvent.change(first, { target: { value: "a" } });
		expect(check().disabled).toBe(true);
		fireEvent.change(second, { target: { value: "c" } });
		expect(check().disabled).toBe(false);
		fireEvent.click(check());
		expect(onSubmit).toHaveBeenCalledWith({ s1: "a", s2: "c" });
	});

	it("result: marks the key correct, the wrong choice wrong, explains, and locks input", () => {
		const onSubmit = vi.fn();
		const { container } = render(
			<QuestionView
				question={mc}
				onSubmit={onSubmit}
				result={{
					correct: false,
					key: { optionId: "b" },
					explanation: { correct: "Owner can assign roles.", perChoice: { a: "Reader cannot assign.", c: "No." } },
				}}
				response={{ optionId: "a" }}
			/>,
		);
		expect(container.querySelector('[data-option="b"]')?.getAttribute("data-state")).toBe("correct");
		expect(container.querySelector('[data-option="a"]')?.getAttribute("data-state")).toBe("wrong");
		expect(screen.getByText("Owner can assign roles.")).toBeTruthy();
		expect(screen.getByText("Reader cannot assign.")).toBeTruthy();
		expect(screen.queryByText("No.")).toBeNull();
		expect((screen.getByLabelText("Owner") as HTMLInputElement).disabled).toBe(true);
		expect(screen.queryByRole("button", { name: /check your answer/i })).toBeNull();
	});
});
