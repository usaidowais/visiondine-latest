import type { JSX as ReactJSX } from 'react';
declare module 'react/jsx-runtime' {
  namespace JSX { interface IntrinsicElements extends ReactJSX.IntrinsicElements { 'model-viewer': Record<string, unknown>; } }
}
declare module 'react/jsx-dev-runtime' {
  namespace JSX { interface IntrinsicElements extends ReactJSX.IntrinsicElements { 'model-viewer': Record<string, unknown>; } }
}
