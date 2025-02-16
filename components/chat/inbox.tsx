"use client";

import { ProfileAvatar } from "@/components/avatar";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/context/use.socket";
import { addConversation } from "@/lib/actions/realtime.actions";
import {
  UserInfo,
  MessageInterface,
  ConversationForInboxInterface,
} from "@/types/types";
import { CheckIcon, PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { toast } from "sonner";

const InboxPage = ({
  conversations,
  userId,
  users,
}: {
  conversations: ConversationForInboxInterface[];
  userId: string;
  users: UserInfo[];
}) => {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [group, setGroup] = useState<string[]>([]);
  const [groupName, setGroupName] = useState<string>("");
  const socket = useSocket();
  const router = useRouter();

  // Setup socket to update online users.
  useEffect(() => {
    if (!socket) return;
    if (socket.connected) {
      socket.emit("online-users", userId);
      socket.on("online-users", (online: string[]) => {
        setOnlineUsers(online);
      });
    } else {
      console.log("socket not connected");
    }
    return () => {
      socket?.off("online-users");
    };
  }, [socket, userId]);

  // Compute unseen count for each conversation based on messages.
  // This assumes conversation.messages is an array of MessageInterface objects.
  const computedConversations = useMemo(() => {
    if (!conversations) return [];
    return conversations.map((conv) => {
      const unseenCount = conv.messages
        ? (conv.messages as MessageInterface[]).filter(
            (msg) => !msg.seenBy.includes(userId)
          ).length
        : 0;
      return { ...conv, unseenCount };
    });
  }, [conversations, userId]);

  // Sort conversations: first those with any online participant (other than the logged-in user),
  // then by recency (updatedAt descending)
  const sortedConversations = useMemo(() => {
    return [...computedConversations].sort((a, b) => {
      const aOnline = a.participants.some(
        (p) => p.userId !== userId && onlineUsers.includes(p.userId)
      );
      const bOnline = b.participants.some(
        (p) => p.userId !== userId && onlineUsers.includes(p.userId)
      );
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [computedConversations, onlineUsers, userId]);

  // Handle group conversation creation.
  const handleConversation = async () => {
    if (group.length === 0) {
      toast.error("Please select at least one user to create a group");
      return;
    }

    if (groupName.length === 0) {
      toast.error("Please enter a group name");
      return;
    }
    if (groupName.length > 25) {
      toast.error("Maximum group name length is 25 characters");
      return;
    }
    const res = await addConversation(userId, group, true, groupName);
    if (res?.error === "Private conversation already exists") {
      router.push(`/inbox/${res.conversationId}`);
    } else if (res?.success) {
      router.push(`/inbox/${res.conversationId}`);
    }
  };

  return (
    <div className="w-full">
      {/* Search and Create Group Section */}
      <div className="flex gap-1 items-center">
        <div className="relative mx-4 my-4 w-full">
          <SearchIcon
            strokeWidth={1.5}
            size={18}
            className="absolute top-1/2 -translate-y-1/2 left-3"
          />
          <Input
            type="text"
            name="search"
            id="search"
            placeholder="Search"
            className="pl-10"
          />
        </div>
        <div>
          <Dialog>
            <DialogTrigger>
              <span className="border mr-4 px-4 py-2 rounded cursor-pointer flex gap-1 text-sm">
                <PlusIcon size={20} />
              </span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader className="items-center">
                <DialogTitle>Create Group</DialogTitle>
              </DialogHeader>
              <Separator />
              <div>
                <h2>Suggested</h2>
                <ScrollArea className="w-full h-[50vh] md:h-[50vh]">
                  <div>
                    {users?.map((user) => (
                      <div
                        key={user.id}
                        className="flex justify-between md:px-4 py-2 cursor-pointer md:hover:bg-gray-100 md:dark:hover:bg-gray-800 my-2"
                        onClick={() => {
                          setGroup((prev) =>
                            prev.includes(user.id)
                              ? prev.filter((id) => id !== user.id)
                              : [...prev, user.id]
                          );
                        }}
                      >
                        <div className="flex gap-3 truncate items-center">
                          <ProfileAvatar
                            image={user.image as string}
                            alt="profile"
                            width="12"
                            height="12"
                          />
                          <p>{user.username}</p>
                        </div>
                        <div className="flex items-center">
                          {group.includes(user.id) ? (
                            <CheckIcon
                              className="rounded-full bg-[#0095f6] p-[2px]"
                              size={24}
                              color="white"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-4">
                  <Input
                    type="text"
                    placeholder="Group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                  <Button className="w-full mt-2" onClick={handleConversation}>
                    Create group
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* Conversation List */}
      {sortedConversations.map((conversation) => (
        <div className="flex flex-col mx-4" key={conversation.id}>
          {conversation.isGroup ? (
            <div className="my-1">
              <Link
                href={`/inbox/${conversation.id}`}
                className="flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2"
              >
                <div className="flex items-center space-x-4 h-fit w-full">
                  <div className="relative w-fit mb-3">
                    <div className="border-2 rounded-full">
                      <ProfileAvatar
                        image={
                          conversation.participants[0].user.image as string
                        }
                        alt="profile"
                        width="8"
                        height="8"
                      />
                    </div>
                    <div className="absolute top-3 left-3 border-2 rounded-full">
                      <ProfileAvatar
                        image={
                          conversation.participants.length > 1
                            ? (conversation.participants[1].user
                                .image as string)
                            : "https://github.com/shadcn.png"
                        }
                        alt="profile"
                        width="8"
                        height="8"
                      />
                    </div>
                  </div>
                  <div className="pl-3 flex items-center justify-between w-full">
                    <div className="w-full">
                      <h2 className="truncate">{conversation.name}</h2>

                      <p className="truncate text-xs">
                        {(() => {
                          // For group conversations, if any participant (except the logged‑in user)
                          // is online, show that participant's username; otherwise, show the last message.
                          const onlineGroup = conversation.participants.filter(
                            (p) =>
                              p.userId !== userId &&
                              onlineUsers.includes(p.userId)
                          );
                          return onlineGroup.length > 0
                            ? onlineGroup[0].user.username +
                                ", " +
                                `${
                                  onlineGroup[1]?.user.username
                                    ? onlineGroup[1].user.username
                                    : ""
                                }` +
                                " ... online"
                            : conversation.lastMessage || "";
                        })()}
                      </p>
                    </div>
                    {conversation.unseenCount > 0 && (
                      <div className="bg-red-500 text-white md:mr-4 rounded-full text-xs font-bold h-6 w-6 flex items-center justify-center">
                        {conversation.unseenCount}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ) : (
            <div>
              {conversation.participants.map((participant) => (
                <div key={participant.userId} className="max-w-full">
                  {participant.userId !== userId && (
                    <Link
                      href={`/inbox/${conversation.id}`}
                      className="flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2"
                    >
                      <div className="flex items-center space-x-4 h-fit w-full">
                        <div className="relative w-fit">
                          <ProfileAvatar
                            image={participant.user.image as string}
                            alt="profile"
                            width="12"
                            height="12"
                          />
                          <div
                            className={`w-4 h-4 bg-green-500 rounded-full absolute bottom-0 right-0 border-2 ${
                              onlineUsers.includes(participant.userId)
                                ? "block"
                                : "hidden"
                            }`}
                          ></div>
                        </div>
                        <div className="w-5/6 flex justify-between items-center">
                          <div className="w-full">
                            <h2 className="truncate">
                              {participant.user.username}
                            </h2>
                            <p className="truncate text-xs w-full">
                              {conversation.lastMessage
                                ? conversation.lastMessage
                                : ""}
                            </p>
                          </div>
                          {conversation.unseenCount > 0 && (
                            <div className="bg-red-500 text-white rounded-full text-xs font-bold h-6 w-6 flex items-center justify-center">
                              {conversation.unseenCount}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default InboxPage;
