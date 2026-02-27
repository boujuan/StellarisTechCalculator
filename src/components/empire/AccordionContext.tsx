import { createContext, useContext, type Accessor } from "solid-js";

export interface AccordionCommand {
  expandCount: number;
  collapseCount: number;
}

const AccordionContext = createContext<Accessor<AccordionCommand>>(
  () => ({ expandCount: 0, collapseCount: 0 })
);

export const AccordionProvider = AccordionContext.Provider;

export const useAccordionCommand = () => useContext(AccordionContext);
