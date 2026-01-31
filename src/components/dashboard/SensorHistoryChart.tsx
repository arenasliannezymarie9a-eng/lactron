import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { SensorReading } from "@/lib/api";
import { format } from "date-fns";

interface SensorHistoryChartProps {
  data: SensorReading[];
  sensorType: "ethanol" | "ammonia" | "h2s";
  color: string;
  label: string;
}

const SensorHistoryChart = ({ data, sensorType, color, label }: SensorHistoryChartProps) => {
  const chartData = data
    .filter((reading) => {
      // Validate that created_at is a valid date
      const date = new Date(reading.created_at);
      return !isNaN(date.getTime());
    })
    .map((reading) => ({
      time: format(new Date(reading.created_at), "HH:mm:ss"),
      value: Number(reading[sensorType]) || 0,
    }))
    .reverse();

  if (chartData.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
        No historical data available
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-24 mt-3"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted)/0.2)" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--muted)/0.3)" }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--muted)/0.3)" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
            formatter={(value: number | string) => [`${Number(value).toFixed(2)} ppm`, label]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default SensorHistoryChart;
