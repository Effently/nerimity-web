import styles from './styles.module.scss';
import Icon from '@/components/ui/icon';
import { getStorageNumber, setStorageNumber, StorageKeys } from '@/common/localStorage';
import InboxDrawerFriends from './friends';
import { classNames, conditionalClass } from '@/common/classNames';
import FriendItem from './friends/friend-item';
import { createEffect, createSignal, For } from 'solid-js';
import useStore from '@/chat-api/store/useStore';
import { FriendStatus } from '@/chat-api/RawData';
import Modal from '@/components/ui/modal';
import AddFriend from './add-friend';
import { useParams } from '@nerimity/solid-router';
import { useCustomPortal } from '@/components/ui/custom-portal';

function Header (props: {selectedIndex: number, onTabClick: (index: number) => void}) {
  const {friends, inbox} = useStore();

  const friendRequests = () => friends.array().filter(friend => friend.status === FriendStatus.PENDING);

  return (
    <div class={styles.header}>
      <HeaderItem
        name='Inbox'
        iconName='inbox'
        selected={props.selectedIndex === 0}
        notificationCount={inbox.notificationCount()}
        onClick={() => props.onTabClick(0)}

      />
      <HeaderItem
        name='Friends'
        iconName='group'
        selected={props.selectedIndex === 1}
        notificationCount={friendRequests().length}
        onClick={() => props.onTabClick(1)}
    />
    </div>
  )
}

function HeaderItem (props: {name: string, iconName: string, selected: boolean, onClick: () => void, notificationCount?: number}) {
  return (
    <div class={classNames(styles.headerItem,  conditionalClass(props.selected, styles.selected))} onClick={props.onClick}>
      <Icon class={styles.headerIcon} name={props.iconName} size={18} />
      {props.name}
      {!!props.notificationCount && <div class={styles.notificationCount}>{props.notificationCount}</div>}
    </div>
  )
}



const InboxDrawer = () => {
  const [selectedIndex, setSelectedIndex] = createSignal(getStorageNumber(StorageKeys.INBOX_DRAWER_SELECTED_INDEX, 0));
  const params = useParams();

  const createPortal = useCustomPortal();

  const {users, account} = useStore();
  
  const onTabClick = (index: number) => {
    setStorageNumber(StorageKeys.INBOX_DRAWER_SELECTED_INDEX, index);
    setSelectedIndex(index);
  }

  const loggedInUser = () => users.get(account.user()?.id!);

  const onSavedNotesClick = () => {
    loggedInUser().openDM();
  }

  const isSavedNotesSelected = () => {
    return loggedInUser()?.inboxChannelId && loggedInUser()?.inboxChannelId === params.channelId;
  };

  const showAddFriendModel = () => {
    createPortal?.(close => <Modal {...close} title="Add Friend" component={() => <AddFriend />} />)
  }


  return (
    <div class={styles.inboxDrawer}>
      <Header selectedIndex={selectedIndex()} onTabClick={onTabClick} />
      <div class={styles.list}>
        {selectedIndex() === 0 && <InboxDrawerTab/>}
        {selectedIndex() === 1 && <InboxDrawerFriends /> }
      </div>
      
      <div class={styles.items}>
        <div class={classNames(styles.item, conditionalClass(isSavedNotesSelected(), styles.selected))} onClick={onSavedNotesClick}>
          <Icon name='note_alt' size={24} />
          <div>Saved Notes</div>
        </div>
        <div class={styles.item} onClick={showAddFriendModel}>
          <Icon name='group_add' size={24} />
          <div>Add Friend</div>
        </div>
      </div>
    </div>
  )
};


const InboxDrawerTab = () => {
  const {inbox, mentions, channels, users} = useStore();


  const mentionUserArray = () => mentions.array().filter(m => {
    const channel = channels.get(m?.channelId!);
    return !channel?.serverId
  }).map(m => users.get(m?.userId!))

  const array = () => {
    const users = mentionUserArray();
    const inboxArray = inbox.array().sort((a, b) => {
      const aTime = new Date(a.channel.lastMessagedAt!).getTime();
      const bTime = new Date(b.channel.lastMessagedAt!).getTime();
      return bTime - aTime;
    });



    for (let i = 0; i < inboxArray.length; i++) {
      const inboxItem = inboxArray[i];
      const alreadyExists = users.find(u => u.id === inboxItem.channel.recipient?.id);
      if (!alreadyExists) {
        users.push(inboxItem.channel.recipient!);
      }
    }
    return users;
  }

  return <div>
    <For each={array()}>
      {user => <FriendItem user={user}  />}
    </For>
  </div>
};





export default InboxDrawer;