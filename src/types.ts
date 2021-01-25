import { render } from "@testing-library/react";
import { mount } from "enzyme";

// This is just a helpful rename of the interface so we can read the below types more easily
export type FullProps<C extends React.ComponentType> = React.ComponentProps<C>;

export type RenderEnzyme<
  Component extends React.ComponentType,
  Props extends Partial<FullProps<Component>>
> = (
  // By using the spread operator in this type, we leverage the optionality of the entire argument itself.
  // eg: If the caller needs no more required props, we don't require they provide test props. But if
  //     they DO still need props, we require a parameter in the function signature.
  //     So the syntax `renderWrapper()` is valid if there are no required props,
  //     otherwise we force `renderWrapper({ ...missingReqs })`
  ...testProps: ConditionallyRequiredTestProps<Component, Props>
) => RenderEnzymeReturn<Component>;

export type RenderRtl<
  Component extends React.ComponentType,
  Props extends Partial<FullProps<Component>>
> = (...testProps: ConditionallyRequiredTestProps<Component, Props>) => RenderRtlReturn<Component>;

type ConditionallyRequiredTestProps<
  Component extends React.ComponentType,
  Props extends Partial<FullProps<Component>>
> =
  // This is where the real magic happens. At type-interpretation time, the compiler can infer from the
  // component's prop type and from the passed props into the `setup*` function if there are any missing
  // required props attributes (done in the `extends true` line).
  // If that's the case, then we require the `render*` method to not only take a props parameter, but we only
  // demand that it has whatever required props are missing (though it may still provide any optional ones or overrides, too).
  // And if the HasRequiredField type does NOT `extends true`, then we don't demand that a props param is provided
  // at all, though the caller is able to if they'd like.
  HasRequiredField<RemainingPropsAndTestOverrides<Component, Props>> extends true
    ? // Though this syntax is unusual, by using an array type that's then spread above by `...testProps`, we can
      // leverage the optional array value `[T?]` syntax, which allows us to not even require any params
      // in our `render*` method at all
      [RemainingPropsAndTestOverrides<Component, Props>]
    : [RemainingPropsAndTestOverrides<Component, Props>?];

// Sort of a boolean value living in the type system. If the generic type T has no remaining required props,
// it's typed as `never` and we `extend` false, else `true`.
type HasRequiredField<T> = RequiredKeys<T> extends never ? false : true;

// This helper type is, as its name implies, pulling out only the required keys from the given interface.
// This is helpful, because when we use the `RemainingPropsAndTestOverrides` as the generic type T,
// we're figuring out at compile time which required props were NOT provided by the initial `setup*` call.
type RequiredKeys<T> = {
  [K in keyof T]-?: Record<string, unknown> extends { [P in K]: T[K] } ? never : K;
}[keyof T];

interface RenderEnzymeReturn<Component extends React.ComponentType> {
  props: FullProps<Component>;
  wrapper: ReturnType<typeof mount>;
}
interface RenderRtlReturn<Component extends React.ComponentType> {
  props: FullProps<Component>;
  view: ReturnType<typeof render>;
}

/**
 * Given the type of a React component and the type of 'base' (a.k.a. 'default') props
 * preset for it, this returns a type containing two things:
 * * Required: any props not already provided in the base props
 * * Optional: any overrides for the base props
 */
export type RemainingPropsAndTestOverrides<
  ComponentType extends React.ComponentType,
  BaseProps extends Partial<FullProps<ComponentType>>
> =
  | Omit<FullProps<ComponentType>, keyof BaseProps>
  | Partial<Pick<FullProps<ComponentType>, keyof FullProps<ComponentType>>>;
