import { Check, TrendingUp } from "lucide-react";

interface PricingParams {
  title: string;
  price: string;
  originalPrice?: string;
  validity?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  popular?: boolean;
  checkBgColor?: string;
  checkTextColor?: string;
  ctaText?: string;
  badge?: string;
  onClick?: () => void | Promise<void>;
}

const Button = ({ children, className, ...props }: any) => (
  <button
    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-[1.02] ${className}`}
    {...props}
  >
    {children}
  </button>
);

export const PricingCard = ({
  title,
  price,
  originalPrice,
  validity,
  description,
  features,
  highlighted = false,
  popular = false,
  checkBgColor = "bg-blue-500",
  checkTextColor = "text-white",
  ctaText = "Get Started",
  badge,
  onClick,
}: PricingParams) => {
  return (
    <div
      className={`rounded-2xl w-full max-w-[380px] p-8 flex flex-col h-full relative transition-all duration-300 transform hover:scale-[1.05] hover:shadow-2xl
        ${
          highlighted
            ? "bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 border-none  "
            : "bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-lg hover:border-neutral-300 dark:hover:border-neutral-600"
        }
        ${popular ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-neutral-50 dark:ring-offset-neutral-900" : ""}
      `}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-6 py-2 bg-blue-600  text-white rounded-full text-sm font-bold shadow-lg">
          Most Popular
        </div>
      )}

      {badge && (
        <div className="absolute -top-3 -right-3 px-3 py-1 bg-red-500 text-white rounded-full text-xs font-bold transform rotate-12">
          {badge}
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">
          {title}
        </h3>

        <div className="flex items-center justify-center gap-2 mb-2">
          {originalPrice && (
            <span className="text-2xl text-gray-400 dark:text-gray-500 line-through font-medium">
              ₹{originalPrice}
            </span>
          )}
          <div className="text-5xl font-bold text-gray-900 dark:text-white flex items-center">
            ₹{price}
            {validity && (
              <span className="text-lg font-normal ml-1 text-gray-500 dark:text-gray-400">
                {validity}
              </span>
            )}
          </div>
        </div>

        {originalPrice && (
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
            <TrendingUp size={14} />
            Save ₹{parseInt(originalPrice) - parseInt(price)}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
        {description}
      </p>

      <div className="space-y-4 flex-grow mb-8">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="mt-0.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${checkBgColor}`}
              >
                <Check className={`h-4 w-4 ${checkTextColor}`} />
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
              {feature}
            </p>
          </div>
        ))}
      </div>

      <Button
        className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        onClick={onClick}
      >
        {ctaText}
      </Button>
    </div>
  );
};
