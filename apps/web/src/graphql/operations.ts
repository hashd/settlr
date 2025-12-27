import { gql } from "@apollo/client/core";

// ============================================
// User Queries
// ============================================

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      name
      avatarUrl
    }
  }
`;

export const DASHBOARD_QUERY = gql`
  query Dashboard {
    dashboard {
      totalOwed
      totalOwe
      netBalance
      groupCount
      monthlySpending
      formattedOwed
      formattedOwe
      formattedNet
      formattedMonthly
      categoryDistribution {
        category
        amount
      }
      topOwedTo {
        userId
        name
        amount
      }
      topOwedBy {
        userId
        name
        amount
      }
    }
    groups {
      id
      name
      icon
      category
      expenseCount
      members {
        id
        user {
          id
          name
        }
      }
    }
    recentActivities(limit: 5) {
      id
      type
      description
      createdAt
      metadata
      actor {
        id
        name
        avatarUrl
      }
      group {
        id
        name
        icon
      }
    }
  }
`;

// ============================================
// Group Queries & Mutations
// ============================================

export const GROUPS_QUERY = gql`
  query Groups {
    groups {
      id
      name
      icon
      category
      createdAt
      expenseCount
      userBalance
      members {
        id
        role
        user {
          id
          name
          email
        }
      }
    }
  }
`;

export const GROUP_QUERY = gql`
  query Group($id: String!) {
    group(id: $id) {
      id
      name
      icon
      category
      simplifyDebts
      members {
        id
        role
        user {
          id
          name
          email
          avatarUrl
          isPseudo
        }
      }
    }
  }
`;

export const CREATE_GROUP_MUTATION = gql`
  mutation CreateGroup(
    $name: String!
    $icon: String
    $category: GroupCategory
  ) {
    createGroup(name: $name, icon: $icon, category: $category) {
      id
      name
      icon
      category
    }
  }
`;

export const ADD_GROUP_MEMBER_MUTATION = gql`
  mutation AddGroupMember($groupId: String!, $email: String!) {
    addGroupMember(groupId: $groupId, email: $email) {
      id
      role
      user {
        id
        name
        email
      }
    }
  }
`;

// ============================================
// Expense Queries & Mutations
// ============================================

export const EXPENSES_QUERY = gql`
  query Expenses($groupId: String!) {
    expenses(groupId: $groupId) {
      id
      description
      amount
      formattedAmount
      date
      category
      splitType
      notes
      receiptUrl
      paidBy {
        id
        name
      }
      payers {
        id
        amount
        formattedAmount
        user {
          id
          name
        }
      }
      shares {
        id
        amount
        user {
          id
          name
        }
      }
      comments {
        id
        text
        createdAt
        user {
          id
          name
        }
      }
    }
  }
`;

export const CREATE_EXPENSE_MUTATION = gql`
  mutation CreateExpense(
    $groupId: String!
    $description: String!
    $amount: Int!
    $paidById: String!
    $category: ExpenseCategory
    $splitType: SplitType
    $shares: [ExpenseShareInput!]!
    $notes: String
    $receiptUrl: String
  ) {
    createExpense(
      groupId: $groupId
      description: $description
      amount: $amount
      paidById: $paidById
      category: $category
      splitType: $splitType
      shares: $shares
      notes: $notes
      receiptUrl: $receiptUrl
    ) {
      id
      description
      amount
      category
      formattedAmount
    }
  }
`;

export const CREATE_SETTLEMENT_MUTATION = gql`
  mutation CreateSettlement(
    $groupId: String!
    $payerId: String!
    $receiverId: String!
    $amount: Int!
    $notes: String
  ) {
    createSettlement(
      groupId: $groupId
      payerId: $payerId
      receiverId: $receiverId
      amount: $amount
      notes: $notes
    ) {
      id
      amount
      formattedAmount
    }
  }
`;

export const GROUP_BALANCES_QUERY = gql`
  query GroupBalances($groupId: String!) {
    groupBalances(groupId: $groupId) {
      amount
      formattedAmount
      ower {
        id
        name
      }
      owee {
        id
        name
      }
    }
  }
`;

export const UPDATE_EXPENSE_MUTATION = gql`
  mutation UpdateExpense(
    $id: String!
    $description: String
    $amount: Int
    $paidById: String
    $category: ExpenseCategory
    $splitType: SplitType
    $shares: [ExpenseShareInput!]
    $notes: String
  ) {
    updateExpense(
      id: $id
      description: $description
      amount: $amount
      paidById: $paidById
      category: $category
      splitType: $splitType
      shares: $shares
      notes: $notes
    ) {
      id
      description
      amount
      category
      formattedAmount
    }
  }
`;

export const DELETE_EXPENSE_MUTATION = gql`
  mutation DeleteExpense($id: String!) {
    deleteExpense(id: $id)
  }
`;

export const UPDATE_GROUP_MUTATION = gql`
  mutation UpdateGroup(
    $id: String!
    $name: String
    $icon: String
    $category: GroupCategory
    $simplifyDebts: Boolean
  ) {
    updateGroup(
      id: $id
      name: $name
      icon: $icon
      category: $category
      simplifyDebts: $simplifyDebts
    ) {
      id
      name
      icon
      category
      simplifyDebts
    }
  }
`;

export const DELETE_GROUP_MUTATION = gql`
  mutation DeleteGroup($id: String!) {
    deleteGroup(id: $id)
  }
`;

export const LEAVE_GROUP_MUTATION = gql`
  mutation LeaveGroup($groupId: String!) {
    leaveGroup(groupId: $groupId)
  }
`;

export const REMOVE_MEMBER_MUTATION = gql`
  mutation RemoveMember($groupId: String!, $userId: String!) {
    removeMember(groupId: $groupId, userId: $userId)
  }
`;

export const UPDATE_MEMBER_ROLE_MUTATION = gql`
  mutation UpdateMemberRole(
    $groupId: String!
    $userId: String!
    $role: MemberRole!
  ) {
    updateMemberRole(groupId: $groupId, userId: $userId, role: $role) {
      id
      role
      user {
        id
        name
      }
    }
  }
`;

// ============================================
// Invitation Queries & Mutations
// ============================================

export const MY_INVITES_QUERY = gql`
  query MyInvites {
    myInvites {
      id
      email
      status
      createdAt
      expiresAt
      group {
        id
        name
        icon
      }
      inviter {
        id
        name
      }
    }
  }
`;

export const GROUP_INVITES_QUERY = gql`
  query GroupInvites($groupId: String!) {
    groupInvites(groupId: $groupId) {
      id
      email
      status
      createdAt
      expiresAt
      inviter {
        id
        name
      }
    }
  }
`;

export const INVITE_TO_GROUP_MUTATION = gql`
  mutation InviteToGroup($groupId: String!, $email: String!) {
    inviteToGroup(groupId: $groupId, email: $email) {
      id
      email
      status
    }
  }
`;

export const RESPOND_TO_INVITE_MUTATION = gql`
  mutation RespondToInvite($inviteId: String!, $accept: Boolean!) {
    respondToInvite(inviteId: $inviteId, accept: $accept) {
      id
      status
    }
  }
`;

export const CANCEL_INVITE_MUTATION = gql`
  mutation CancelInvite($inviteId: String!) {
    cancelInvite(inviteId: $inviteId)
  }
`;

export const CREATE_PSEUDO_USER_MUTATION = gql`
  mutation CreatePseudoUser($groupId: String!, $name: String!) {
    createPseudoUser(groupId: $groupId, name: $name) {
      id
      name
      email
      isPseudo
    }
  }
`;

export const CLAIM_PSEUDO_USER_MUTATION = gql`
  mutation ClaimPseudoUser(
    $pseudoUserId: String!
    $email: String!
    $groupId: String!
  ) {
    claimPseudoUser(
      pseudoUserId: $pseudoUserId
      email: $email
      groupId: $groupId
    ) {
      id
      email
      status
    }
  }
`;

export const GROUP_ACTIVITIES_QUERY = gql`
  query GroupActivities($groupId: String!, $limit: Int) {
    groupActivities(groupId: $groupId, limit: $limit) {
      id
      type
      description
      metadata
      createdAt
      actor {
        id
        name
        avatarUrl
      }
    }
  }
`;

export const EXPORT_GROUP_DATA_QUERY = gql`
  query ExportGroupData($groupId: String!) {
    exportGroupData(groupId: $groupId)
  }
`;

export const CREATE_COMMENT_MUTATION = gql`
  mutation CreateComment($expenseId: String!, $text: String!) {
    createComment(expenseId: $expenseId, text: $text) {
      id
      text
      createdAt
      user {
        id
        name
      }
    }
  }
`;

export const DELETE_COMMENT_MUTATION = gql`
  mutation DeleteComment($id: String!) {
    deleteComment(id: $id)
  }
`;

// ============================================
// Recurring Expenses
// ============================================

export const RECURRING_EXPENSES_QUERY = gql`
  query RecurringExpenses($groupId: String!) {
    recurringExpenses(groupId: $groupId) {
      id
      description
      amount
      formattedAmount
      currency
      category
      splitType
      frequency
      dayOfMonth
      dayOfWeek
      nextDueDate
      participantIds
      isActive
      createdAt
    }
  }
`;

export const CREATE_RECURRING_EXPENSE_MUTATION = gql`
  mutation CreateRecurringExpense(
    $groupId: String!
    $description: String!
    $amount: Int!
    $category: String
    $splitType: String
    $frequency: String!
    $dayOfMonth: Int
    $dayOfWeek: Int
    $participantIds: [String!]!
  ) {
    createRecurringExpense(
      groupId: $groupId
      description: $description
      amount: $amount
      category: $category
      splitType: $splitType
      frequency: $frequency
      dayOfMonth: $dayOfMonth
      dayOfWeek: $dayOfWeek
      participantIds: $participantIds
    ) {
      id
      description
    }
  }
`;

export const DELETE_RECURRING_EXPENSE_MUTATION = gql`
  mutation DeleteRecurringExpense($id: String!) {
    deleteRecurringExpense(id: $id)
  }
`;

export const PROCESS_RECURRING_EXPENSE_MUTATION = gql`
  mutation ProcessRecurringExpense($id: String!) {
    processRecurringExpense(id: $id)
  }
`;

// ============================================
// Balance Adjustment
// ============================================

export const ADJUST_BALANCE_MUTATION = gql`
  mutation AdjustBalance(
    $groupId: String!
    $fromUserId: String!
    $toUserId: String!
    $amount: Int!
    $notes: String!
  ) {
    adjustBalance(
      groupId: $groupId
      fromUserId: $fromUserId
      toUserId: $toUserId
      amount: $amount
      notes: $notes
    ) {
      id
      amount
      notes
      type
    }
  }
`;

export const SEND_PAYMENT_REMINDER_MUTATION = gql`
  mutation SendPaymentReminder(
    $groupId: String!
    $toUserId: String!
    $amount: Int!
  ) {
    sendPaymentReminder(groupId: $groupId, toUserId: $toUserId, amount: $amount)
  }
`;
