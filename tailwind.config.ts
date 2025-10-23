import type { Config } from "tailwindcss";

export default {
  plugins: [require("@tailwindcss/typography")],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['MonoLisa', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        bold: '700',
        black: '900',
      },
      typography: () => ({
        DEFAULT: {
          css: {
            a: {
              textUnderlineOffset: "2px",
              "&:hover": {
                "@media (hover: hover)": {
                  textDecorationColor: "var(--color-link)",
                  textDecorationThickness: "2px",
                },
              },
            },
            blockquote: {
              borderLeftWidth: "0",
            },
            code: {
              border: "1px dotted #666",
              borderRadius: "2px",
            },
            kbd: {
              "&:where([data-theme='dark'], [data-theme='dark'] *)": {
                background: "var(--color-global-text)",
              },
            },
            hr: {
              borderTopStyle: "dashed",
            },
            strong: {
              fontWeight: "700",
            },
            sup: {
              marginInlineStart: "calc(var(--spacing) * 0.5)",
              a: {
                "&:after": {
                  content: "']'",
                },
                "&:before": {
                  content: "'['",
                },
                "&:hover": {
                  "@media (hover: hover)": {
                    color: "var(--color-link)",
                  },
                },
              },
            },
            /* Table */
            "tbody tr": {
              borderBottomWidth: "none",
            },
            tfoot: {
              borderTop: "1px dashed #666",
            },
            thead: {
              borderBottomWidth: "none",
            },
            "thead th": {
              borderBottom: "1px dashed #666",
              fontWeight: "700",
            },
            'th[align="center"], td[align="center"]': {
              "text-align": "center",
            },
            'th[align="right"], td[align="right"]': {
              "text-align": "right",
            },
            'th[align="left"], td[align="left"]': {
              "text-align": "left",
            },
          },
        },
        sm: {
          css: {
            fontSize: "16px",
            lineHeight: "1.5",
            p: {
              marginTop: "1.25rem",
              marginBottom: "1.25rem",
            },
            code: {
              fontSize: "16px",
              fontWeight: "400",
            },
          },
        },
      }),
    },
  },
} satisfies Config;
