import Image from "next/image";
import {DropZone} from "@/app/dropzone";

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full mt-5">
      <p className="text-2xl font-semibold">next-easy-s3-upload</p>
      <p className="text-zinc-400 text-sm mb-5">aws-x-prisma example</p>
      <DropZone />
    </div>
  );
}
